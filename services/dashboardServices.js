const dashboardRepository = require("../repository/dashboardRepository");
const constant = require("../constants/constant");
const schoolRepository = require("../repository/schoolRepository");
const studentRepository = require("../repository/studentRepository");
const subjectRepository = require("../repository/subjectRepository");
const teacherRepository = require("../repository/teacherRepository");
const unitRepository = require("../repository/unitRepository");
const quizRepository = require("../repository/quizRepository");
const settingsRepository = require("../repository/settingsRepository");
const questionRepository = require("../repository/questionRepository");
const quizResultRepository = require("../repository/quizResultRepository");
const chapterRepository = require("../repository/chapterRepository");
const topicRepository = require("../repository/topicRepository");
const userRepository = require("../repository/userRepository");
const { getS3SignedUrl } = require("../helper/helper");

exports.getAssessmentDetails = (request, callback) => {
  // get the class % to generate reports using school_id
  // get total num of students in that class using class_id
  // track down necessary tables till you get ALL the topics(pre/post) that are there in that subject using subject_id
  // sub -> units -> chap -> topics -> concepts -> groups -> questions
  // fetch all the ACTIVE quiz (pre/post) of that subject with the chosen topic IDs
  // All topics - selected topics in each quiz = skipped topics (applicable only for Post Quiz)
  // then for each quiz refer to the quiz result table, get the count of answer sheets uploaded
  // calculate the % of answer sheets uploaded for each quiz
  // compare this result with the % you fetched from school table
  // if this % is more than configured %, then the topic is completed, else it is remaining

  try{
  schoolRepository.getSchoolDetailsById(
    request,
    (schoolDataErr, schoolDataRes) => {
      if (schoolDataErr) {
        console.log(schoolDataErr);
        callback(schoolDataErr, schoolDataRes);
      } else {
        console.log("----------------coming-------------------");

        const classPercentagePre =
          schoolDataRes.Items[0].pre_quiz_config.class_percentage_for_report;
        const classPercentagePost =
          schoolDataRes.Items[0].post_quiz_config.class_percentage_for_report;

         

        studentRepository.getStudentsData(
          request,
          function (
            fetch_teacher_section_students_err,
            fetch_teacher_section_students_response
          ) {
            if (fetch_teacher_section_students_err) {
              console.log("----------------coming2-------------------");
              console.log(fetch_teacher_section_students_err);
              callback(
                fetch_teacher_section_students_err,
                fetch_teacher_section_students_response
              );
            } else {

              const studentsCount = fetch_teacher_section_students_response.Items.length;

              subjectRepository.getSubjetById(
                request,
                function (subject_err, subject_res) {
                  if (subject_err) {
                    console.log(subject_err);
                    console.log("----------------getSubjetById-------------------");

                    callback(subject_err, subject_res);
                  } else {
                    if (subject_res.Items.length > 0) {
                      let subject_unit_id =
                        subject_res.Items[0].subject_unit_id;

                      unitRepository.fetchUnitData(
                        { subject_unit_id: subject_unit_id },
                        async function (unit_err, unit_res) {
                          if (unit_err) {
                            console.log(unit_err);
                            console.log("----------------fetchUnitData-------------------");

                            callback(unit_err, unit_res);
                          } else {
                            if (unit_res.Items.length > 0) {
                              let unit_chapter_id = [];

                              await unit_res.Items.forEach((e) =>
                                unit_chapter_id.push(...e.unit_chapter_id)
                              );

                              chapterRepository.fetchBulkChaptersIDName(
                                { unit_chapter_id: unit_chapter_id },
                                function (chapter_err, chapter_res) {
                                  if (chapter_err) {

                                    console.log("----------------fetchBulkChaptersIDName-------------------");
                                    console.log(chapter_err);
                                    callback(chapter_err, chapter_res);
                                  } else {
                                    let preLearningTopicsCount = 0;
                                    let postLearningTopicsCount = 0;
                                    let preLearningCompletedTopicsCount = 0;
                                    let postLearningCompletedTopicsCount = 0;
                                    let notConsideredTopicsPre = 0;
                                    let notConsideredTopicsPost = 0;
                                    chapter_res.Items.map(ele=>
                                    {
                                      preLearningTopicsCount += ele.prelearning_topic_id.length;
                                      postLearningTopicsCount += ele.postlearning_topic_id.length;
                                    })

                                    console.log(preLearningTopicsCount);
                                    console.log(postLearningTopicsCount);
                                    quizRepository.fetchAllQuizBasedonSubject(
                                      request,
                                      async (quizDataErr, quizDataRes) => {
                                        if (quizDataErr) {
                                          console.log(quizDataErr);
                                          callback(quizDataErr, quizDataRes);
                                        } else {

                                          // console.log("--------------",quizDataRes);
                                          const quizIds = [];
                                          await Promise.all(
                                          quizDataRes.Items.map((val)=>
                                          // [{quiz_id : "cc50fb3a-f992-57d8-85dc-c159e02194c5"} ,{ quiz_id :"615584c2-0864-5f03-9397-62d5e148a6bc"}].map((val)=>
                                          {
                                            
                                            return new Promise((resolve, reject) => {
                                              quizResultRepository.fetchQuizResultByQuizId( { data: { quiz_id: val.quiz_id } }, async (quizResultDataErr, quizResultDataRes) => {
                                                if (quizResultDataErr) {
                                                  console.log(quizResultDataErr);
                                                  return reject(quizResultDataErr);
                                                } else {

                                                  let studentsAttendedQuiz = quizResultDataRes.Items.length
                                                  if(val.learningType == "preLearning")
                                                  {
                                                    if(val.not_considered_topics)
                                                          notConsideredTopicsPre += val.not_considered_topics;
                                                    if(studentsAttendedQuiz >= (classPercentagePre * studentsCount * 0.01))
                                                    {
                                                      preLearningCompletedTopicsCount += val.selectedTopics.length
                                                    }
                                                  }
                                                  else{
                                                    if(val.not_considered_topics)
                                                          notConsideredTopicsPost += val.not_considered_topics;
                                                    if(studentsAttendedQuiz >= (classPercentagePost * studentsCount * 0.01))
                                                    {
                                                      postLearningCompletedTopicsCount += val.selectedTopics.length
                                                    }
                                                  }
                                              console.log( "--- - -",quizResultDataRes.Items.length); 
                                              resolve();                             
                                                }
                                              })
                                            })
                                          }))
                                          console.log("quizIds - ",quizIds);
                                        }}
                                    )
                                    callback(200,{
                                      preLearningTopics: {
                                        content: ((preLearningCompletedTopicsCount / preLearningTopicsCount) * 100).toFixed(1) + "%",
                                        totalTopics: preLearningTopicsCount,
                                        completedTopics: preLearningCompletedTopicsCount,
                                        // skippedTopics: 5,
                                        notConsideredTopics : notConsideredTopicsPre,
                                        remainingTopics: preLearningTopicsCount - preLearningCompletedTopicsCount - notConsideredTopicsPre,
                                      },
                                      postLearningTopics: {
                                        content: ((postLearningCompletedTopicsCount / postLearningTopicsCount) * 100).toFixed(1) + "%",
                                        totalTopics: postLearningTopicsCount,
                                        completedTopics: postLearningCompletedTopicsCount,
                                        notConsideredTopics : notConsideredTopicsPost,
                                        // skippedTopics: 5,
                                        remainingTopics: postLearningTopicsCount - postLearningCompletedTopicsCount - notConsideredTopicsPost ,
                                      },
                                      WorksheetsGenerated: {
                                        content: 28,
                                      },
                                      QuestionPapersGenerated: {
                                        content: 13,
                                      },
                                    });
                                    // callback(200,{preLearningTopicsCount ,postLearningTopicsCount ,preLearningCompletedTopicsCount ,postLearningCompletedTopicsCount});
                                  }
                                }
                              );
                            } else {
                              // response.chapters = unit_res.Items;
                              callback(200, unit_res.Items);
                            }
                          }
                        }
                      );
                    } else {
                      // response.chapters = subject_res.Items;
                      callback(200, subject_res.Items);
                    }
                  }
                }
              );
            }
          }
        );
      }
    }
  );
  
   } catch (error) {
  console.error(error);
  callback(error);
}
};

// const request2 = { data :{
//     //  client_class_id : "1df5eb4b-1186-57a1-8984-f36fcfbfcb8b",
//     //  section_id : "f0d3d2ea-e1b6-5a1d-829d-83aefbe7a065",
//     //  subject_id : "331c1f7f-b3fd-5ae3-b361-11cf90ba3675",
//     //  quiz_status : "Active"
//     client_class_id : "1807a694-3b96-5e78-848a-8a2b69bce740",
//     section_id : "49c0fdef-6959-5103-9d0f-6a53caa48e4a",
//     subject_id : "331c1f7f-b3fd-5ae3-b361-11cf90ba3675",
//     quiz_status : "Active"
// }
// }
exports.getTargetedLearningExpectation = async (request, callback) => {
  let classStrength = 0;
  let totalTopics = 0;
  let reachedTopics = 0;

  console.log(request);
 await schoolRepository.getSchoolDetailsById(
    request,
    (schoolDataErr, schoolDataRes) => {
      if (schoolDataErr) {
        console.log(schoolDataErr); 
        callback(schoolDataErr, schoolDataRes);
      } else {       
        console.log("-----------schoolDataRes------------------  ",schoolDataRes.Items[0].teacher_access);
        const classPercentagePre =
          schoolDataRes.Items[0].pre_quiz_config.class_percentage;
        const classPercentagePost =
          schoolDataRes.Items[0].post_quiz_config.class_percentage;
  
   studentRepository.getStudentsData(
    request,
    (studentDataErr, studentDataRes) => {
      if (studentDataErr) {
        console.log(studentDataErr);
        callback(studentDataErr, studentDataRes);
      } else {
        classStrength = studentDataRes?.Items?.length;
        console.log("--StudentsData------", studentDataRes.Items.length);

        quizRepository.fetchAllQuizBasedonSubject(
          request,
          async (quizDataErr, quizDataRes) => {
            if (quizDataErr) {
              console.log(quizDataErr);
              callback(quizDataErr, quizDataRes);
            } else {
              quizDataRes.Items.map((val) => {
                let passedStudentsOfParticularQuiz = 0;
                totalTopics += val.selectedTopics.length;

                console.log("val.quiz_id  -  ", val.quiz_id);
                quizResultRepository.fetchQuizResultByQuizId(
                  { data: { quiz_id: val.quiz_id } },
                  (quizResultDataErr, quizResultDataRes) => {
                    if (quizResultDataErr) {
                      console.log(quizResultDataErr);
                      callback(quizResultDataErr, quizResultDataRes);
                    } else {
                      console.log(
                        "=================quizResultDataRes========================================================="
                      );
                      console.log(
                        "total students atended quiz --",
                        quizResultDataRes.Items.length
                      );
                      quizResultDataRes.Items.map((val) => {
                        // if(val.isPassed)
                        if (true) {
                          passedStudentsOfParticularQuiz++;
                        }
                      });
                    }
                  }
                );
                console.log(
                  "passedStudentsOfParticularQuiz --", passedStudentsOfParticularQuiz," classStrength -- ", classStrength
                );
                if(val.learningType == "preLearning" && schoolDataRes.Items[0].teacher_access.prequiz_targetlearning == 'Yes')
                {
                  // console.log("----classPercentagePre--------",passedStudentsOfParticularQuiz >= classStrength * classPercentagePre * 0.01);
                  if (passedStudentsOfParticularQuiz >= (classPercentagePre ? classStrength * classPercentagePre * 0.01  : 0)) {
                    console.log("coming");
                    reachedTopics += val.selectedTopics.length;
                  }
                }
                else if (passedStudentsOfParticularQuiz >= (classPercentagePost ? classStrength * classPercentagePost * 0.01  : 0)) {
                  console.log("------classPercentagePost------",classPercentagePost);
                  reachedTopics += val.selectedTopics.length;
                }
              });
              console.log("---totalTopics------", totalTopics , " reachedTopics  - ",reachedTopics ,"");

              callback(0, { totalTopics, reached: reachedTopics , classPercentagePre ,  classPercentagePost , totalStrength  : classStrength});
            }
          }
        );
        // callback(500 ,"Insufficient Data");
      }
    }
  );
}
}
)
};

exports.getTargetedLearningExpectationDetails = async (request, callback) => {
  // const request2 = { data :{

  //          client_class_id : "1df5eb4b-1186-57a1-8984-f36fcfbfcb8b",
  //          section_id : "f0d3d2ea-e1b6-5a1d-829d-83aefbe7a065",
  //          subject_id : "331c1f7f-b3fd-5ae3-b361-11cf90ba3675",
  //          quiz_status : "Active"
  //         }
  //     };
  //     const request3 = { data :{
  //     client_class_id : "1807a694-3b96-5e78-848a-8a2b69bce740",
  //         section_id : "49c0fdef-6959-5103-9d0f-6a53caa48e4a",
  //         subject_id : "331c1f7f-b3fd-5ae3-b361-11cf90ba3675",
  //         quiz_status : "Active"
  //     }};


 await schoolRepository.getSchoolDetailsById(
    request,
    (schoolDataErr, schoolDataRes) => {
      if (schoolDataErr) {
        console.log(schoolDataErr);
        callback(schoolDataErr, schoolDataRes);
      } else {
        const classPercentagePre =
          schoolDataRes.Items[0].pre_quiz_config.class_percentage;
        const classPercentagePost =
          schoolDataRes.Items[0].post_quiz_config.class_percentage;
   
   studentRepository.getStudentsData(
    request,
    (studentDataErr, studentDataRes) => {
      if (studentDataErr) {
        console.log(studentDataErr);
        callback(studentDataErr, studentDataRes);
      } else {
        const classStrength = studentDataRes?.Items?.length;
        console.log("--StudentsData------", studentDataRes.Items.length);

        quizRepository.fetchAllQuizBasedonSubject(
          request,
          async (quizDataErr, quizDataRes) => {
            if (quizDataErr) {
              console.log(quizDataErr);
              callback(quizDataErr, quizDataRes);
            } else {
              const groupByChapterId = (data) => {
                // Sort the data by chapter_id
                data.sort((a, b) => {
                  if (a.chapter_id < b.chapter_id) return -1;
                  if (a.chapter_id > b.chapter_id) return 1;
                  return 0;
                });

                const groupedData = data.reduce((acc, item) => {
                  const chapterId = item.chapter_id;
                  const chapterName = "item.chapter_name"; // Assuming each item has a chapter_name field
                  const chapterIndex = acc.findIndex(
                    (chapter) => chapter.id === chapterId
                  );

                  const quizData = {
                    selectedTopics: item.selectedTopics,
                    quiz_id: item.quiz_id,
                    passedStudentsOfParticularQuiz:
                      item.passedStudentsOfParticularQuiz,
                    failedStudentsOfParticularQuiz:
                      item.failedStudentsOfParticularQuiz,
                    learningType: item.learningType,
                    date: item.quizStartDate.dd_mm_yyyy,
                  };

                  if (chapterIndex === -1) {
                    // Chapter doesn't exist, create new chapter
                    acc.push({
                      id: chapterId,
                      chapterName: chapterName,
                      classPercentagePost,
                      classPercentagePre,
                      totalStrength: classStrength,
                      data: [quizData],
                    });
                  } else {
                    // Chapter exists, push to its data array
                    acc[chapterIndex].data.push(quizData);
                  }

                  return acc;
                }, []);

                // here data contains quizes sorted on chapter id
                console.log(
                  "---------------------groupedData----------------------------"
                );
                console.log(groupedData);
                console.log("----------------");

                const processQuizResults = async () => {
                  // Iterate over the array of chapters
                  await Promise.all(
                    groupedData.map(async (chapter) => {
                      await Promise.all(
                        chapter.data.map(async (val, i) => {
                          // quizes of same chapter
                          console.log(
                            "-----groupedData[chapterId].length--------",
                            val.quiz_id
                          );

                          return new Promise((resolve, reject) => {
                            quizResultRepository.fetchQuizResultByQuizId(
                              { data: { quiz_id: val.quiz_id } },
                              async (quizResultDataErr, quizResultDataRes) =>
                               {
                                if (quizResultDataErr) {
                                  console.log(quizResultDataErr);
                                  return reject(quizResultDataErr);
                                } else {
                                  let failedStudents = [];
                                  let passedStudentsOfParticularQuiz = 0;
                                  console.log(
                                    "-----quizResultDataRes.Items.length--------",
                                    quizResultDataRes
                                  );
                                  quizResultDataRes.Items.forEach((val) => {
                                    console.log("-----------", val.student_id);
                                  });

                                  quizResultDataRes.Items.forEach((val) => {
                                    if (val.isPassed) {
                                      passedStudentsOfParticularQuiz++;
                                    } else {
                                      failedStudents.push(val.student_id);
                                    }
                                  });

                                  failedStudents = failedStudents.map((id) => {
                                    const item = studentDataRes.Items.find(
                                      (item) => item.student_id === id
                                    );
                                    return item
                                      ? item.user_firstname +
                                          " " +
                                          user_lastname
                                      : "Student NP";
                                  });
                                  chapter.data[i][
                                    "passedStudentsOfParticularQuiz"
                                  ] = passedStudentsOfParticularQuiz;
                                  chapter.data[i][
                                    "failedStudentsOfParticularQuiz"
                                  ] = failedStudents;
                                  const ids = groupedData.map(
                                    (item) => item.id
                                  );

                                  await new Promise((resolve, reject) => {
                                    chapterRepository.fetchBulkChaptersIDName(
                                      { unit_chapter_id: ids },
                                      (chapterDataErr, chapterDataRes) => {
                                        if (chapterDataErr) {
                                          console.log(chapterDataErr);
                                          return reject(chapterDataErr);
                                        } else {
                                          groupedData.map((val) => {
                                            let present =
                                              chapterDataRes.Items.find((ele) =>
                                                  ele.chapter_id == val.id
                                              );
                                            if (present)
                                              val.chapterName =
                                                present.chapter_title;
                                          });
                                          resolve();
                                        }
                                      }
                                    );
                                  });
                                  const allTopicIds = groupedData.flatMap((chapter) =>
                                      chapter.data.flatMap((quiz) =>
                                        quiz.selectedTopics.map(
                                          (topic) => topic.topic_id
                                        )
                                      )
                                  );

                                  await new Promise((resolve, reject) => {
                                    topicRepository.fetchBulkTopicsIDName(
                                      { unit_Topic_id: allTopicIds },
                                      (topicDataErr, topicDataRes) => {
                                        if (topicDataErr) {
                                          console.log(topicDataErr);
                                          return reject(topicDataErr);
                                        } else {
                                          groupedData.forEach((item) => {
                                            item.data.forEach((entry) => {
                                              entry.selectedTopics.forEach(
                                                (topic) => {
                                                  const detail = topicDataRes.Items.find((detail) =>
                                                        detail.topic_id === topic.topic_id
                                                    );
                                                  if (detail) {
                                                    topic.topic_title = detail.topic_title;
                                                  }
                                                }
                                              );
                                            });
                                          });

                                          resolve();
                                        }
                                      }
                                    );
                                  });

                                  resolve();
                                }
                              }
                            );
                          });
                        })
                      );
                    })
                  );

                  // After processing all data

                  return groupedData;
                };

                processQuizResults()
                  .then((result) => {
                    callback(0, result);
                  })
                  .catch((error) => {
                    callback(500, error);
                  });

                // return groupedData;
              };
              constant.quizSetDetails;
              groupByChapterId(quizDataRes.Items);
            }
          }
        );
        //   console.log(sortedAndGroupedData);
      }
    }
  );
}})
};

exports.getAssesmentSummaryDetails = (request, callback) => {


  // await chapterRepository

  const data = {
    preLearningTopics: {
      content: "62.5%",
      targetCount: 220,
      completedCount: 220,
      totalTopics: 20,
      completedTopics: 10,
      skippedTopics: 5,
      remainingTopics: 5,
    },
    postLearningTopics: {
      content: "62.5%",
      targetCount: 220,
      completedCount: 220,
      totalTopics: 20,
      completedTopics: 10,
      skippedTopics: 5,
      remainingTopics: 5,
    },
    WorksheetsGenerated: {
      content: 28,
    },
    QuestionPapersGenerated: {
      content: 13,
    },
  };
  callback(0, data);
};

// exports.preLearningSummaryDetails = (request, callback) => {

//   try{
//     schoolRepository.getSchoolDetailsById(
//       request,
//       (schoolDataErr, schoolDataRes) => {
//         if (schoolDataErr) {
//           console.log(schoolDataErr);
//           callback(schoolDataErr, schoolDataRes);
//         } else {
//           console.log("----------------coming-------------------",request);
//           // const classPercentagePre =
//           //   schoolDataRes.Items[0].pre_quiz_config.class_percentage_for_report;
//           // const classPercentagePost =
//           //   schoolDataRes.Items[0].post_quiz_config.class_percentage_for_report;
  
//           studentRepository.getStudentsData(
//             request,
//             function (
//               fetch_teacher_section_students_err,
//               fetch_teacher_section_students_response
//             ) {
//               if (fetch_teacher_section_students_err) {
//                 console.log(fetch_teacher_section_students_err);
//                 callback(
//                   fetch_teacher_section_students_err,
//                   fetch_teacher_section_students_response
//                 );
//               } else {
  
//                 const studentsCount = fetch_teacher_section_students_response.Items.length;
  
//                 subjectRepository.getSubjetById(
//                   request,
//                   function (subject_err, subject_res) {
//                     if (subject_err) {
//                       console.log(subject_err);
//                       console.log("----------------getSubjetById-------------------");
  
//                       callback(subject_err, subject_res);
//                     } else {
//                       if (subject_res.Items.length > 0) {
//                         let subject_unit_id =
//                           subject_res.Items[0].subject_unit_id;
  
//                         unitRepository.fetchUnitData(
//                           { subject_unit_id: subject_unit_id },
//                           async function (unit_err, unit_res) {
//                             if (unit_err) {
//                               console.log(unit_err);
//                               console.log("----------------fetchUnitData-------------------");
  
//                               callback(unit_err, unit_res);
//                             } else {
//                               if (unit_res.Items.length > 0) {
//                                 let unit_chapter_id = [];
  
//                                 await unit_res.Items.forEach((e) =>
//                                   unit_chapter_id.push(...e.unit_chapter_id)
//                                 );
  
//                                 chapterRepository.fetchBulkChaptersIDName(
//                                   { unit_chapter_id: unit_chapter_id },
//                                   function (chapter_err, chapter_res) {
//                                     if (chapter_err) {
  
//                                       // console.log("----------------fetchBulkChaptersIDName-------------------");
//                                       console.log(chapter_err);
//                                       callback(chapter_err, chapter_res);
//                                     } else {
//                                       quizRepository.fetchAllQuizBasedonSubject(
//                                         request,
//                                         async (quizDataErr, quizDataRes) => {
//                                           if (quizDataErr) {
//                                             console.log(quizDataErr);
//                                             callback(quizDataErr, quizDataRes);
//                                           } else {
//                                             console.log("---------------------------quizDataRes-------------------------------------");
//                                             console.log("---------------------",quizDataRes);
//                                             // chapter_res.items.map(val =>)
//                                             // const quiz =  quizDataRes.Items.find(val => val.learningType == 'preLearning');
//                                             quizDataRes.Items.forEach(quiz => {
//                                               // if (quiz.learningType === 'preLearning') {
//                                                 if (quiz.learningType === request.data.type) {
//                                                   // Find the matching chapter by chapter_id
//                                                   const chapter = chapter_res.Items.find(ch => ch.chapter_id === quiz.chapter_id);
//                                                   if (chapter) {
//                                                       // Push the quiz_id to the prelearning_topic_id array
//                                                       chapter.quiz_id = quiz.quiz_id;
//                                                       chapter.startDate = quiz.quizStartDate.dd_mm_yyyy;
//                                                       chapter.notConsideredTopics = ["c39e9703-cf72-5f20-baf9-7f1efe2a5212",
//                                                       "95224b24-aa14-5077-89ed-512c2ce0e061",
//                                                       "166879e9-91b7-564d-ac84-b86c7b922f93",];
//                                                       // chapter.notConsideredTopics = quiz.not_considered_topics;
//                                                       // console.log("___________________",quiz.not_considered_topics);
    
//                                                   }
//                                               }
//                                           });

//                                           console.log("=================================================================");
//                                           console.log(chapter_res);
//                                           console.log("=================================================================");
//                                           const topicIds = [];
//                                           await Promise.all(
//                                             chapter_res.Items.map(val => {
//                                               val.totalStrength = studentsCount;
//                                                  if(val.notConsideredTopics)
//                                                    topicIds.concat(val.notConsideredTopics);
//                                                 if (val.quiz_id) {
//                                                     return new Promise((resolve, reject) => {
//                                                         quizResultRepository.fetchQuizResultByQuizId(
//                                                             { data: { quiz_id: val.quiz_id } },
//                                                             (quizResultDataErr, quizResultDataRes) => {
//                                                                 if (quizResultDataErr) { 
//                                                                     console.log(quizResultDataErr);
//                                                                     return reject(quizResultDataErr);
//                                                                 } else {
//                                                                     let totalmarks = 0;
//                                                                     val.student_attendance = quizResultDataRes.Items.length;
                                        
//                                                                     quizResultDataRes.Items.forEach(result => {
//                                                                         totalmarks += result.marks_details[0].totalMark || 0;
//                                                                     });
                                        
//                                                                     val.avgMarks = quizResultDataRes.Items.length > 0 ? (totalmarks / quizResultDataRes.Items.length) : 0;
                                                                    
//                                                                     resolve();
//                                                                 }
//                                                             }
//                                                         );
//                                                     });
//                                                 } else {
//                                                     return Promise.resolve();
//                                                 }
//                                             })
//                                         );

//                                         if(topicIds.length >0)
//                                         await new Promise((resolve, reject) => {
//                                           topicRepository.fetchBulkTopicsIDName(
//                                             { unit_Topic_id: topicIds },
//                                             (topicDataErr, topicDataRes) => {
//                                               if (topicDataErr) {
//                                                 console.log(topicDataErr);
//                                                 return reject(topicDataErr);
//                                               } else {

//                                                 console.log("__________",topicDataRes);
//                                                 chapter_res.Items.map(val => {
//                                                   if(val.notConsideredTopics)
//                                                   {
//                                                     val.notConsideredTopics.map(id => {
//                                                       const topic = topicDataRes.find(item => item.topic_id === id);
//                                                       return topic ? topic.topic_title : id;
//                                                   });
//                                                   }
//                                                 })
//                                                 resolve();


//                                               }})});

//                                             // console.log(quiz);

//                                             callback(0, chapter_res);
                                            
//                                           }
//                                         }
//                                       )
//                                     }
//                                   }
//                                 )
//                               }
//                             }
//                           }
//                         )
//                       }
//                     }
//                   }
//                 )
//               }
//             })
//           }
//         }
//        )
//       }
//       catch (error) {
//         console.error(error);
//         callback(error);
//       }
//     }

exports.preLearningSummaryDetails = async (request, callback) => {
  try {
    const schoolDataRes = await new Promise((resolve, reject) => {
      schoolRepository.getSchoolDetailsById(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    const studentsDataRes = await new Promise((resolve, reject) => {
      studentRepository.getStudentsData(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    const studentsCount = studentsDataRes.Items.length;

    const subjectDataRes = await new Promise((resolve, reject) => {
      subjectRepository.getSubjetById(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    if (subjectDataRes.Items.length > 0) {
      const subject_unit_id = subjectDataRes.Items[0].subject_unit_id;

      const unitDataRes = await new Promise((resolve, reject) => {
        unitRepository.fetchUnitData({ subject_unit_id }, (err, res) => {
          if (err) {
            console.log(err);
            return reject(err);
          }
          resolve(res);
        });
      });

      if (unitDataRes.Items.length > 0) {
        let unit_chapter_id = [];
        unitDataRes.Items.forEach((e) => unit_chapter_id.push(...e.unit_chapter_id));

        const chapterDataRes = await new Promise((resolve, reject) => {
          chapterRepository.fetchBulkChaptersIDName({ unit_chapter_id }, (err, res) => {
            if (err) {
              console.log(err);
              return reject(err);
            }
            resolve(res);
          });
        });

        const quizDataRes = await new Promise((resolve, reject) => {
          quizRepository.fetchAllQuizBasedonSubject(request, (err, res) => {
            if (err) {
              console.log(err);
              return reject(err);
            }
            resolve(res);
          });
        });

        quizDataRes.Items.forEach((quiz) => {
          if (quiz.learningType === request.data.type) {
            const chapter = chapterDataRes.Items.find((ch) => ch.chapter_id === quiz.chapter_id);
            if (chapter) {
              chapter.quiz_id = quiz.quiz_id;
              chapter.startDate = quiz.quizStartDate.dd_mm_yyyy;
              chapter.notConsideredTopics = quiz.not_considered_topics;
            }
          }
        });

        const topicIds = [];
        await Promise.all(
          chapterDataRes.Items.map(async (val) => {
            val.totalStrength = studentsCount;
            if (val.notConsideredTopics) {
              topicIds.push(...val.notConsideredTopics);
            }
            if (val.quiz_id) {
              const quizResultDataRes = await new Promise((resolve, reject) => {
                quizResultRepository.fetchQuizResultByQuizId(
                  { data: { quiz_id: val.quiz_id } },
                  (err, res) => {
                    if (err) {
                      console.log(err);
                      return reject(err);
                    }
                    resolve(res);
                  }
                );
              });

              let totalMarks = 0;
              val.student_attendance = quizResultDataRes.Items.length;

              quizResultDataRes.Items.forEach((result) => {
                totalMarks += result.marks_details[0].totalMark || 0;
              });

              val.avgMarks = quizResultDataRes.Items.length > 0 ? totalMarks / quizResultDataRes.Items.length : 0;
            }
          })
        );

        if (topicIds.length > 0) {
          const topicDataRes = await new Promise((resolve, reject) => {
            topicRepository.fetchBulkTopicsIDName({ unit_Topic_id: topicIds }, (err, res) => {
              if (err) {
                console.log(err);
                return reject(err);
              }
              resolve(res);
            });
          });

          chapterDataRes.Items.forEach((val) => {
            if (val.notConsideredTopics) {
              val.notConsideredTopics = val.notConsideredTopics.map((id) => {
                const topic = topicDataRes.Items.find((item) => item.topic_id === id);
                return topic ? topic.topic_title : id;
              });
            }
          });
        }

        callback(null, chapterDataRes);
      }
    }
  } catch (error) {
    console.error(error);
    callback(error);
  }
};



// exports.postLearningSummaryDetails = (request, callback) => {
//       try{
//         schoolRepository.getSchoolDetailsById(
//           request,
//           (schoolDataErr, schoolDataRes) => {
//             if (schoolDataErr) {
//               console.log(schoolDataErr);
//               callback(schoolDataErr, schoolDataRes);
//             } else {
//               // const classPercentagePre =
//               //   schoolDataRes.Items[0].pre_quiz_config.class_percentage_for_report;
//               // const classPercentagePost =
//               //   schoolDataRes.Items[0].post_quiz_config.class_percentage_for_report;
      
//               studentRepository.getStudentsData(
//                 request,
//                 function (
//                   fetch_teacher_section_students_err,
//                   fetch_teacher_section_students_response
//                 ) {
//                   if (fetch_teacher_section_students_err) {
//                     console.log(fetch_teacher_section_students_err);
//                     callback(
//                       fetch_teacher_section_students_err,
//                       fetch_teacher_section_students_response
//                     );
//                   } else {
      
//                     const studentsCount = fetch_teacher_section_students_response.Items.length;
//                     console.log("-===================3========================");
      
//                     subjectRepository.getSubjetById(
//                       request,
//                       function (subject_err, subject_res) {
//                         if (subject_err) {
//                           console.log(subject_err);
//                           console.log("----------------getSubjetById-------------------");
      
//                           callback(subject_err, subject_res);
//                         } else {
//                           if (subject_res.Items.length > 0) {
//                             let subject_unit_id =
//                               subject_res.Items[0].subject_unit_id;
      
//                             unitRepository.fetchUnitData(
//                               { subject_unit_id: subject_unit_id },
//                               async function (unit_err, unit_res) {
//                                 if (unit_err) {
//                                   console.log(unit_err);
//                                   console.log("----------------fetchUnitData-------------------");
      
//                                   callback(unit_err, unit_res);
//                                 } else {
//                                   if (unit_res.Items.length > 0) {
//                                     let unit_chapter_id = [];
      
//                                     await unit_res.Items.forEach((e) =>
//                                       unit_chapter_id.push(...e.unit_chapter_id)
//                                     );
      
//                                     chapterRepository.fetchBulkChaptersIDName(
//                                       { unit_chapter_id: unit_chapter_id },
//                                       function (chapter_err, chapter_res) {
//                                         if (chapter_err) {
      
//                                           // console.log("----------------fetchBulkChaptersIDName-------------------");
//                                           console.log(chapter_err);
//                                           callback(chapter_err, chapter_res);
//                                         } else {

//                                           const topicIds = [];
//                                           quizRepository.fetchAllQuizBasedonSubject(
//                                             request,
//                                             async (quizDataErr, quizDataRes) => {
//                                               if (quizDataErr) {
//                                                 console.log(quizDataErr);
//                                                 callback(quizDataErr, quizDataRes);
//                                               } else {
//                                                 console.log("---------------------------quizDataRes-------------------------------------");
//                                                 console.log("---------------------",quizDataRes);
                                              
//                                                 // chapter_res.items.map(val =>)
//                                                 // const quiz =  quizDataRes.Items.find(val => val.learningType == 'preLearning');
//                                                 quizDataRes.Items.forEach(quiz => {
//                                                   // if (quiz.learningType === 'preLearning') {

//                                                   if (quiz.not_considered_topics) {
//                                                     topicIds.push(...quiz.not_considered_topics);
//                                                   }
//                                                     if (quiz.learningType === request.data.type) {
//                                                       // Find the matching chapter by chapter_id
//                                                       const chapter = chapter_res.Items.find(ch => ch.chapter_id === quiz.chapter_id);
//                                                       if (chapter) {
//                                                           // Push the quiz_id to the prelearning_topic_id array
//                                                           if(!chapter.quiz_id)
//                                                           {
//                                                             chapter.quiz_id = [];
//                                                             chapter.notConsideredTopics = [  "c39e9703-cf72-5f20-baf9-7f1efe2a5212",
//                                                             "95224b24-aa14-5077-89ed-512c2ce0e061",];
//                                                           }
//                                                           // chapter.quiz_id.push(quiz.quiz_id);
//                                                           chapter.quiz_id.push({
//                                                             id: quiz.quiz_id,
//                                                             name: quiz.quiz_name,
//                                                           })
//                                                           if (quiz.not_considered_topics) 
//                                                           chapter.notConsideredTopics.push(...quiz.not_considered_topics);
//                                                           // chapter.quiz_id= quiz.quiz_id;
//                                                           chapter.startDate = quiz.quizStartDate.dd_mm_yyyy;
        
//                                                       }
//                                                   }
//                                               });
    
//                                             await Promise.all(
//                                             chapter_res.Items.map(async val => {
//                                               val.totalStrength = studentsCount;
                                              
//                                               if (Array.isArray(val.quiz_id) && val.quiz_id.length > 0) {
                                  
//                                                   // Process each quiz ID object
//                                                   await Promise.all(val.quiz_id.map(quiz => {
//                                                       return new Promise((resolve, reject) => {
//                                                           quizResultRepository.fetchQuizResultByQuizId(
//                                                               { data: { quiz_id: quiz.id } },
//                                                               (quizResultDataErr, quizResultDataRes) => {
//                                                                   if (quizResultDataErr) {
//                                                                       console.log(quizResultDataErr);
//                                                                       return reject(quizResultDataErr);
//                                                                   } else {
//                                                                     let totalmarks = 0;
//                                                                     let totalAttendance = 0;
//                                                                       totalAttendance += quizResultDataRes.Items.length;
                                                                      
//                                                                       quizResultDataRes.Items.forEach(result => {
//                                                                           totalmarks += result.marks_details[0].totalMark || 0;
//                                                                       });
//                                                                       quiz.student_attendance = totalAttendance;
//                                                                       quiz.avgMarks = totalAttendance > 0 ? (totalmarks / totalAttendance) : 0;
//                                                                       resolve();
//                                                                   }
//                                                               }
//                                                           );
//                                                       });
//                                                   }));
                                  

//                                               } 
//                                               }));
    
//                                                 console.log("_______________________________",chapter_res);

//                                                 if (topicIds.length > 0) {
//                                                   const topicDataRes = await new Promise((resolve, reject) => {
//                                                     topicRepository.fetchBulkTopicsIDName({ unit_Topic_id: topicIds }, (err, res) => {
//                                                       if (err) {
//                                                         console.log(err);
//                                                         return reject(err);
//                                                       }
//                                                       resolve(res);
//                                                     });
//                                                   });
                                        
//                                                   chapter_res.Items.forEach((val) => {
//                                                     if (val.notConsideredTopics) {
//                                                       val.notConsideredTopics = val.notConsideredTopics.map((id) => {
//                                                         const topic = topicDataRes.Items.find((item) => item.topic_id === id);
//                                                         return topic ? topic.topic_title : id;
//                                                       });
//                                                     }
//                                                   });
//                                                 }

//                                                 callback(0, chapter_res);
                                                
//                                               }
//                                             }
//                                           )
//                                         }
//                                       }
//                                     )
//                                   }
//                                 }
//                               }
//                             )
//                           }
//                         }
//                       }
//                     )
//                   }
//                 })
//               }
//             }
//            )
//           }
//           catch (error) {
//             console.error(error);
//             callback(error);
//           }
//         }

exports.postLearningSummaryDetails = async (request, callback) => {
  try {

    const studentsDataRes = await new Promise((resolve, reject) => {
      studentRepository.getStudentsData(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    const studentsCount = studentsDataRes.Items.length;

    const subjectDataRes = await new Promise((resolve, reject) => {
      subjectRepository.getSubjetById(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    if (subjectDataRes.Items.length > 0) {
      const subject_unit_id = subjectDataRes.Items[0].subject_unit_id;

      const unitDataRes = await new Promise((resolve, reject) => {
        unitRepository.fetchUnitData({ subject_unit_id }, (err, res) => {
          if (err) {
            console.log(err);
            return reject(err);
          }
          resolve(res);
        });
      });

      if (unitDataRes.Items.length > 0) {
        let unit_chapter_id = [];
        unitDataRes.Items.forEach((e) => unit_chapter_id.push(...e.unit_chapter_id));

        const chapterDataRes = await new Promise((resolve, reject) => {
          chapterRepository.fetchBulkChaptersIDName({ unit_chapter_id }, (err, res) => {
            if (err) {
              console.log(err);
              return reject(err);
            }
            resolve(res);
          });
        });

        const topicIds = [];
        const quizDataRes = await new Promise((resolve, reject) => {
          quizRepository.fetchAllQuizBasedonSubject(request, (err, res) => {
            if (err) {
              console.log(err);
              return reject(err);
            }
            resolve(res);
          });
        });

        quizDataRes.Items.forEach((quiz) => {
          if (quiz.not_considered_topics) {
            topicIds.push(...quiz.not_considered_topics);
          }
          if (quiz.learningType === request.data.type) {
            const chapter = chapterDataRes.Items.find((ch) => ch.chapter_id === quiz.chapter_id);
            if (chapter) {
              if (!chapter.quiz_id) {
                chapter.quiz_id = [];
                chapter.notConsideredTopics = [];
              }
              chapter.quiz_id.push({
                id: quiz.quiz_id,
                name: quiz.quiz_name,
              });
              if (quiz.not_considered_topics) {
                chapter.notConsideredTopics.push(...quiz.not_considered_topics);
              }
              chapter.startDate = quiz.quizStartDate.dd_mm_yyyy;
            }
          }
        });

        await Promise.all(
          chapterDataRes.Items.map(async (val) => {
            val.totalStrength = studentsCount;

            if (Array.isArray(val.quiz_id) && val.quiz_id.length > 0) {
              await Promise.all(
                val.quiz_id.map((quiz) => {
                  return new Promise((resolve, reject) => {
                    quizResultRepository.fetchQuizResultByQuizId(
                      { data: { quiz_id: quiz.id } },
                      (err, res) => {
                        if (err) {
                          console.log(err);
                          return reject(err);
                        }
                        let totalmarks = 0;
                        let totalAttendance = 0;
                        totalAttendance += res.Items.length;

                        res.Items.forEach((result) => {
                          totalmarks += result.marks_details[0].totalMark || 0;
                        });

                        quiz.student_attendance = totalAttendance;
                        quiz.avgMarks = totalAttendance > 0 ? totalmarks / totalAttendance : 0;
                        resolve();
                      }
                    );
                  });
                })
              );
            }
          })
        );

        if (topicIds.length > 0) {
          const topicDataRes = await new Promise((resolve, reject) => {
            topicRepository.fetchBulkTopicsIDName({ unit_Topic_id: topicIds }, (err, res) => {
              if (err) {
                console.log(err);
                return reject(err);
              }
              resolve(res);
            });
          });

          chapterDataRes.Items.forEach((val) => {
            if (val.notConsideredTopics) {
              val.notConsideredTopics = val.notConsideredTopics.map((id) => {
                const topic = topicDataRes.Items.find((item) => item.topic_id === id);
                return topic ? topic.topic_title : id;
              });
            }
          });
        }

        callback(null, chapterDataRes);
      }
    }
  } catch (error) {
    console.error(error);
    callback(error);
  }
};


exports.viewAnalysisIndividualReport = async (request, callback) =>
{
  try{
       const request2 = {
        data : {
        student_id : "a6dcd932-36b9-570b-87da-6f854624a1ad",
        quiz_id : "6597a41e-617b-5e38-a9ab-f47bb27240bd"
        }
       }

      //  const quizData = await new Promise((resolve, reject) => {
      //   quizRepository.fetchQuizDataById(request2, (err, res) => {
      //     if (err) {
      //       console.log(err);
      //       return reject(err);
      //     }
      //     console.log("-------------------res-------------------------------");
      //     resolve(res);
      //   });
      // });

      const quizData = {
        Item : {
        "quiz_id": "6597a41e-617b-5e38-a9ab-f47bb27240bd",
        "chapter_id": "313d007a-fde7-5e76-b19c-f6a3e03c2395",
        "client_class_id": "1df5eb4b-1186-57a1-8984-f36fcfbfcb8b",
        "common_id": "61692656",
        "created_ts": "2024-07-19T10:09:49.853Z",
        "lc_quiz_name": "test-sunil",
        "learningType": "preLearning",
        "noOfQuestionsForAuto": 1,
        "not_considered_topics": [
         "32a03e5e-db31-5381-81a9-05e93c692949",
         "166879e9-91b7-564d-ac84-b86c7b922f93",
         "804ef086-9f30-51dd-b15d-e2a24ece8603",
         "03fc5402-ac95-5350-8089-6a1171ff5e88",
        ],
        "question_track_details": {
         "qp_set_a": [
          {
           "concept_id": "cca2abf9-a1cb-58cc-b1e2-d6df02a97b7c",
           "group_id": "f64a1e5e-67bb-5880-9e01-eee3bc029b20",
           "question_id": "7902c1c4-b791-50f1-bde8-34e2f54332a9",
           "topic_id": "32a03e5e-db31-5381-81a9-05e93c692949",
           "type": "advanced"
          }
         ],
         "qp_set_b": [
          {
           "concept_id": "cca2abf9-a1cb-58cc-b1e2-d6df02a97b7c",
           "group_id": "f64a1e5e-67bb-5880-9e01-eee3bc029b20",
           "question_id": "7902c1c4-b791-50f1-bde8-34e2f54332a9",
           "topic_id": "32a03e5e-db31-5381-81a9-05e93c692949",
           "type": "advanced"
          }
         ],
         "qp_set_c": [
          {
           "concept_id": "cca2abf9-a1cb-58cc-b1e2-d6df02a97b7c",
           "group_id": "f64a1e5e-67bb-5880-9e01-eee3bc029b20",
           "question_id": "7902c1c4-b791-50f1-bde8-34e2f54332a9",
           "topic_id": "32a03e5e-db31-5381-81a9-05e93c692949",
           "type": "advanced"
          }
         ]
        },
        "quizEndDate": {
         "dd_mm_yyyy": "00-00-0000",
         "yyyy_mm_dd": "N.A."
        },
        "quizEndTime": "N.A.",
        "quizMode": "offline",
        "quizStartDate": {
         "dd_mm_yyyy": "00-00-0000",
         "yyyy_mm_dd": "N.A."
        },
        "quizStartTime": "N.A.",
        "quizType": "automated",
        "quiz_duration": 6,
        "quiz_name": "Test-Sunil",
        "quiz_question_details": {
         "qp_set_a": [
          "7902c1c4-b791-50f1-bde8-34e2f54332a9"
         ],
         "qp_set_b": [
          "7902c1c4-b791-50f1-bde8-34e2f54332a9"
         ],
         "qp_set_c": [
          "7902c1c4-b791-50f1-bde8-34e2f54332a9"
         ]
        },
        "quiz_status": "Active",
        "quiz_template_details": {
         "set_a": {
          "answer_sheet": "quiz_uploads/6597a41e-617b-5e38-a9ab-f47bb27240bd/answer_sheet_template/set_a/6b7f4bec-b59b-593f-81d8-f1fcacbd27e6.pdf",
          "question_sheet": "quiz_uploads/6597a41e-617b-5e38-a9ab-f47bb27240bd/question_paper_template/set_a/60917515-178e-51fa-941d-5a87d2e30ebe.pdf"
         },
         "set_b": {
          "answer_sheet": "quiz_uploads/6597a41e-617b-5e38-a9ab-f47bb27240bd/answer_sheet_template/set_b/4f9621c0-df7c-5002-b0d6-d5dcafb8e30c.pdf",
          "question_sheet": "quiz_uploads/6597a41e-617b-5e38-a9ab-f47bb27240bd/question_paper_template/set_b/2a6b0a83-a369-5503-be5d-12de9bd05bcd.pdf"
         },
         "set_c": {
          "answer_sheet": "quiz_uploads/6597a41e-617b-5e38-a9ab-f47bb27240bd/answer_sheet_template/set_c/d68f5dce-d0b9-5475-80c8-9bbd44cce24b.pdf",
          "question_sheet": "quiz_uploads/6597a41e-617b-5e38-a9ab-f47bb27240bd/question_paper_template/set_c/2d3fd833-1bf6-59a3-b118-4a858c62fb00.pdf"
         }
        },
        "section_id": "f0d3d2ea-e1b6-5a1d-829d-83aefbe7a065",
        "selectedTopics": [
         {
          "noOfQuestions": "N.A.",
          "topic_id": "32a03e5e-db31-5381-81a9-05e93c692949"
         },
         {
          "noOfQuestions": "N.A.",
          "topic_id": "166879e9-91b7-564d-ac84-b86c7b922f93"
         },
         {
          "noOfQuestions": "N.A.",
          "topic_id": "804ef086-9f30-51dd-b15d-e2a24ece8603"
         },
         {
          "noOfQuestions": "N.A.",
          "topic_id": "03fc5402-ac95-5350-8089-6a1171ff5e88"
         },
         {
          "noOfQuestions": "N.A.",
          "topic_id": "b79dceae-2b3b-5efe-bce4-ef938c9d9858"
         },
         {
          "noOfQuestions": "N.A.",
          "topic_id": "15df6a6f-666c-5b9d-88b4-8cede28452df"
         },
         {
          "noOfQuestions": "N.A.",
          "topic_id": "c39e9703-cf72-5f20-baf9-7f1efe2a5212"
         }
        ],
        "subject_id": "331c1f7f-b3fd-5ae3-b361-11cf90ba3675",
        "updated_ts": "2024-07-19T10:10:02.621Z",
        "varient": "randomOrder"
       }
      }


    // const studentsDataRes = await new Promise((resolve, reject) => {
    //   quizResultRepository.fetchQuizResultDataOfStudent(request2, (err, res) => {
    //     if (err) {
    //       console.log(err);
    //       return reject(err);
    //     }
    //     resolve(res);
    //   });
    // });


   const studentsDataRes =  {
    Items : [{
      "result_id": "80ca1dc4-e986-564b-b3a6-e94c9a2884d3",
      "common_id": "61692656",
      "created_ts": "2023-09-21T11:02:32.529Z",
      "evaluated": "Yes",
      "isPassed": true,
      "marks_details": {
       "qa_details": [
        {
         "modified_marks": "N.A.",
         "obtained_marks": 3,
         "question_id": "e82ebc83-9245-514f-aa41-605358ff959a",
         "student_answer": "It is a vector quantity,it is not velocity"
        },
        {
         "modified_marks": "N.A.",
         "obtained_marks": 4,
         "question_id": "698829b1-1cb8-58a1-b2a8-2c97d70aa55b",
         "student_answer": "Sunil"
        },
        {
         "modified_marks": "N.A.",
         "obtained_marks": 7.01,
         "question_id": "7902c1c4-b791-50f1-bde8-34e2f54332a9",
         "student_answer": "is Wrong,be,care"
        },
        {
         "modified_marks": "N.A.",
         "obtained_marks": 0,
         "question_id": "7aa5fb14-ce57-583f-9d07-eb2b47cf817a",
         "student_answer": ""
        },
        {
         "modified_marks": "N.A.",
         "obtained_marks": 2,
         "question_id": "01605b03-31be-59b2-bf42-61c80f76dba7",
         "student_answer": "Yes,No"
        },
        {
         "modified_marks": "N.A.",
         "obtained_marks": 0,
         "question_id": "52a78ca0-bc80-5924-bcd9-1f3ab7077f66",
         "student_answer": ""
        },
        {
         "modified_marks": "N.A.",
         "obtained_marks": 0,
         "question_id": "097c55f7-5dc8-5d3a-b2e6-0989e936b401",
         "student_answer": "sdsasdas Wrong"
        }
       ],
       "set_key": "qp_set_c",
       "set_name": "C"
      },
      "quiz_id": "615584c2-0864-5f03-9397-62d5e148a6bc",
      "quiz_set": "c",
      "student_id": "a6dcd932-36b9-570b-87da-6f854624a1ad",
      "updated_ts": "2023-09-21T11:02:32.529Z"
     }]
    }


if(quizData.Item && studentsDataRes.Items[0] )
{
  let questionIds =  quizData.Item.question_track_details[studentsDataRes.Items[0].marks_details.set_key].map((val)=>
  {
    return val.question_id;
  })

    const topicIds =  quizData.Item.question_track_details[studentsDataRes.Items[0].marks_details.set_key].map((val)=>
    {
   return val.topic_id;
    })


    const questions = await new Promise((resolve, reject) => {
      questionRepository.fetchBulkQuestionsNameById({question_id : questionIds }, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    questions.Items.push({
      "question_id": "7902c1c4-b791-50f1-bde8-34e2f54332a9",
      "question_content": "<p>Because the Equipmet $$Blank12$$ very delicate. It must $$Blank22$$ handle with $$Blank32$$.&nbsp;</p>",
      "answers_of_question": [
          {
              "answer_weightage": "5",
              "answer_display": "Yes",
              "answer_content": "is",
              "answer_option": "Blank12",
              "answer_type": "Words"
          },
          {
              "answer_weightage": "5",
              "answer_display": "Yes",
              "answer_content": "be",
              "answer_option": "Blank22",
              "answer_type": "Words"
          },
          {
              "answer_weightage": "2.01",
              "answer_display": "Yes",
              "answer_content": "care",
              "answer_option": "Blank32",
              "answer_type": "Words"
          },
          {
          "answer_content": "question_uploads/5e8c4e49-a8f0-582f-b512-1d680c3f9974.jpg",
          "answer_display": "Yes",
          "answer_option": "Options",
          "answer_type": "Image",
          "answer_weightage": "12"
         },
         {
          "answer_content": "question_uploads/7964d66d-194d-5450-84b7-a51a5d07de76.wav",
          "answer_display": "NO",
          "answer_option": "",
          "answer_type": "Audio File",
          "answer_weightage": ""
         }
      ],
      "question_type": "Subjective",
      "cognitive_skill": "cog cog io",
      "marks": 15,
      "topic_title": "T9",
      "obtained_marks": 7.01
  });



    console.log("----------------------------------------");
    console.log(questions);

    const topicNames = await new Promise((resolve, reject) => {
      topicRepository.fetchBulkTopicsIDName({ unit_Topic_id: topicIds }, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });


    const cognitive_id = questions.Items.map(que => que.cognitive_skill )

    const cognitiveSkillNames = await new Promise((resolve, reject) => {
      settingsRepository.fetchBulkCognitiveSkillNameById({ cognitive_id: cognitive_id }, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });
    console.log("----cognitive_id--------",cognitiveSkillNames);
    questions.Items.map(async que =>
      {
        const ans = quizData.Item.question_track_details[studentsDataRes.Items[0].marks_details.set_key].find((val)=> val.question_id == que.question_id );
        console.log("----------ans-------",ans);

        que.topic_title = topicNames.Items.find(val =>
            val.topic_id == ans.topic_id
          ).topic_title;

          que.cognitive_skill = cognitiveSkillNames.Items.find(val =>
            val.cognitive_id == que.cognitive_skill
          )
          que.cognitive_skill = que.cognitive_skill ? que.cognitive_skill.cognitive_name : "" ;


          que.obtained_marks = studentsDataRes.Items[0].marks_details.qa_details.find(val =>
            val.question_id == que.question_id
          ).obtained_marks;

          await Promise.all(
            que.answers_of_question.map(async ans => {
                if (ans.answer_type === "Image" || ans.answer_type === "Audio File") {
                    ans.answer_content = await getS3SignedUrl(ans.answer_content);
                }
                return ans; // Make sure to return the updated answer
            })
        );
      }
    )
    console.log("0-==================");
    console.log(await getS3SignedUrl("question_uploads/7c70deb3-fdac-5cdd-9c89-f35324dfd412.jpg"));
    callback(null , questions)
}
else
callback(null , [])
  } 
  catch (error) {
  console.error(error);
  callback(error);
  }
}





