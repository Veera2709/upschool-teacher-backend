const {blueprintRepository,testQuestionPaperRepository,commonRepository} = require("../repository")
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { TABLE_NAMES } = require('../constants/tables');

// exports.fetchTestQuestionPapersBasedonStatus = (request, callback) => {

//   testQuestionPaperRepository.getTestQuestionPapersBasedonStatus(request, async function (test_question_paper_err, test_question_paper_res) {
//     if (test_question_paper_err) {
//       console.log(test_question_paper_err);
//       callback(test_question_paper_err, test_question_paper_res);
//     } else {

//       if (test_question_paper_res.Items.length > 0) {

//         let blueprint_array = await test_question_paper_res.Items.map((e) => e.blueprint_id);

//         blueprintRepository.fetchBluePrintData({ blueprint_array: blueprint_array }, async function (fetch_blue_print_err, fetch_blue_print_res) {
//           if (fetch_blue_print_err) {
//             console.log(fetch_blue_print_err);
//             callback(fetch_blue_print_err, fetch_blue_print_res);
//           } else {

//             await test_question_paper_res.Items.forEach((test_paper, index) => {
//               let bluePrint = fetch_blue_print_res.Items.filter((blue_print) => blue_print.blueprint_id === test_paper.blueprint_id)
//               if (bluePrint.length > 0) {
//                 test_question_paper_res.Items[index].blueprint_name = bluePrint[0].blueprint_name
//                 delete test_question_paper_res.Items[index].blueprint_id;
//               }
//             })
//             callback(200, test_question_paper_res.Items);
//           }
//         })
//       } else {
//         callback(200, test_question_paper_res.Items);
//       }
//     }
//   })
// }
exports.fetchTestQuestionPapersBasedonStatus = async (request) => {
  try {
    const testQuestionPaperRes = await testQuestionPaperRepository.getTestQuestionPapersBasedonStatus2(request);    
    const blueprintArray = testQuestionPaperRes.map((val) => ({ "blueprint_id": val.blueprint_id }));
    const fetchBluePrintRes = await blueprintRepository.fetchBluePrintData2({ items: blueprintArray, condition: "OR" });
    testQuestionPaperRes.forEach((testPaper) => {
      const blueprint = fetchBluePrintRes.find((bp) => bp.blueprint_id === testPaper.blueprint_id);
      if (blueprint) {
        testPaper.blueprint_name = blueprint.blueprint_name;
        delete testPaper.blueprint_id;
      }
    });
    return testQuestionPaperRes;
  } catch (error) {
    console.error(error);
    throw error; 
  }
};


exports.addTestQuestionPaper = (request, callback) => {

  testQuestionPaperRepository.fetchTestQuestionPaperbyName(request, function (fetch_question_paper_err, fetch_question_paper_res) {
    if (fetch_question_paper_err) {
      console.log(fetch_question_paper_err);
      callback(fetch_question_paper_err, fetch_question_paper_res);
    } else {
      if (fetch_question_paper_res.Items.length === 0) {

        testQuestionPaperRepository.insertTestQuestionPaper(request, function (add_question_paper_err, add_question_paper_res) {
          if (add_question_paper_err) {
            console.log(add_question_paper_err);
            callback(add_question_paper_err, add_question_paper_res);
          } else {
            callback(add_question_paper_err, add_question_paper_res);
          }
        })
      } else {
        callback(400, constant.messages.TEST_QUESTION_PAPER_NAME_ALREADY_EXISTS);
      }
    }
  })
}

exports.validateQuestionPaperName = (request, callback) => {

  testQuestionPaperRepository.fetchTestQuestionPaperbyName(request, function (fetch_question_paper_err, fetch_question_paper_res) {
    if (fetch_question_paper_err) {
      console.log(fetch_question_paper_err);
      callback(fetch_question_paper_err, fetch_question_paper_res);
    } else {
      if (fetch_question_paper_res.Items.length === 0) {
        callback(0, 200);
      } else {
        callback(400, constant.messages.TEST_QUESTION_PAPER_NAME_ALREADY_EXISTS);
      }
    }
  })
}

exports.viewTestQuestionPaper = (request, callback) => {

  testQuestionPaperRepository.fetchTestQuestionPaperByID(request, function (fetch_question_paper_err, fetch_question_paper_res) {
    if (fetch_question_paper_err) {
      console.log(fetch_question_paper_err);
      callback(fetch_question_paper_err, fetch_question_paper_res);
    } else {
      console.log(fetch_question_paper_res.Items[0]);

      if (fetch_question_paper_res.Items.length > 0) {
        let questionsData = JSON.parse(JSON.stringify(fetch_question_paper_res.Items[0].questions));
        let queationIDs = [];

        async function fetchAllQuestionIDs(i) {
          if (i < questionsData.length) {
            queationIDs = queationIDs.concat(await questionsData[i].question_id.map(ques => ques));
            i++;
            fetchAllQuestionIDs(i);
          }
          else {
            queationIDs = helper.removeDuplicates(queationIDs);

            /** FETCH Questions DATA **/
            let fetchBulkCatReq = {
              IdArray: queationIDs,
              fetchIdName: "question_id",
              TableName: TABLE_NAMES.upschool_question_table,
              projectionExp: ["question_id", "question_content", "answers_of_question", "question_type", "marks", "display_answer"]
            }

            commonRepository.fetchBulkDataWithProjection(fetchBulkCatReq, async function (fetch_questions_err, fetch_questions_res) {
              if (fetch_questions_err) {
                console.log(fetch_questions_err);
                callback(fetch_questions_err, fetch_questions_res);
              } else {

                /** SET FINAL Question Paper View DATA **/
                exports.setQuestionPaperView(questionsData, fetch_questions_res.Items, (questionsErr, questionsRes) => {
                  if (questionsErr) {
                    console.log(questionsErr);
                    callback(questionsErr, questionsRes);
                  }
                  else {
                    console.log(questionsRes);
                    fetch_question_paper_res.Items[0].questions = questionsRes
                    callback(questionsErr, fetch_question_paper_res);
                  }
                })
                /** END SET FINAL Question Paper View DATA **/
              }
            })
            /** END FETCH Questions DATA **/
          }
        }
        fetchAllQuestionIDs(0);
      }
      else {
        console.log(constant.messages.NO_DATA);
        callback(400, constant.messages.NO_DATA);
      }

    }
  })
}

exports.setQuestionPaperView = (questionsSectionData, questionData, callback) => {

  let tempQuestionArr = [];
  let individualQuestion = [];

  function setSectionsData(i) {

    tempQuestionArr = [];

    if (i < questionsSectionData.length) {
      async function setQuestionsData(j) {
        individualQuestion = [];
        if (j < questionsSectionData[i].question_id.length) {
          individualQuestion = questionData.filter(value => value.question_id === questionsSectionData[i].question_id[j])[0];

          await helper.getAnswerContentFileUrl(individualQuestion.answers_of_question)
            .then(url => {
              individualQuestion.answers_of_question = url;
              tempQuestionArr.push(individualQuestion);
              j++;
              setQuestionsData(j);
            })
            .catch(err => {
              individualQuestion.answers_of_question = "N.A.";
              tempQuestionArr.push(individualQuestion);
              j++;
              setQuestionsData(j);
            });

        } else {
          questionsSectionData[i].questions = tempQuestionArr;
          i++;
          setSectionsData(i);
        }
      } setQuestionsData(0);

    } else {

      callback(0, questionsSectionData);

    }

  } setSectionsData(0);

}

exports.toggleQuestionPaperBasedOnId = function (request, callback) {
  testQuestionPaperRepository.getClassTestsBasedonIds(request, function (fetch_class_test_err, fetch_class_test_response) {
    if (fetch_class_test_err) {
      console.log("getClassTestsBasedonIds", fetch_class_test_err);
    } else {
      if (fetch_class_test_response.Items.length === 0) {
        testQuestionPaperRepository.updateQuestionPaperStatus(request, function (update_question_err, update_question_response) {
          if (update_question_err) {
            console.log("update_question_err", update_question_err);
          } else {
            console.log("update_question_response", update_question_response);
            callback(update_question_err, update_question_response)
          }
        })
      } else {
        callback(400, fetch_class_test_response)
      }
    }
  })
}
