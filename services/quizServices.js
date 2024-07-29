const quizRepository = require("../repository/quizRepository");
const quizResultRepository = require("../repository/quizResultRepository");
const classTestServices = require("./classTestServices");
const constant = require("../constants/constant");
const helper = require('../helper/helper');
const { request } = require("http");
const commonRepository = require("../repository/commonRepository");
const { TABLE_NAMES } = require('../constants/tables');
const schoolRepository = require("../repository/schoolRepository"); 

exports.checkDuplicateQuizName = (request, callback) => {
    quizRepository.checkDuplicateQuizName(request, function (quizData_error, quizData_response) {
        if (quizData_error) {
            console.log(quizData_error);
            callback(quizData_error, quizData_response);
        } else {
            if (quizData_response.Items.length > 0) {
                // console.log("Data already exist with the specified quiz name ");
                callback(400, constant.messages.DUPLICATE_QUIZ_NAME);
            }
            else {
                callback(quizData_error, 200);
            }

        }
    })
}

exports.updateQuizStatus = (request, callback) => {
    if(request.data.quiz_status == constant.status.active){
        quizRepository.fetchQuizDataById(request, function (preQuiz_error, preQuiz_response) {
            if (preQuiz_error) {
                console.log(preQuiz_error);
                callback(preQuiz_error, preQuiz_response);
            } else {
                console.log(preQuiz_response);
                request.data.client_class_id = preQuiz_response.Item.client_class_id;
                request.data.chapter_id = preQuiz_response.Item.chapter_id;
                request.data.subject_id = preQuiz_response.Item.subject_id;
                request.data.section_id = preQuiz_response.Item.section_id;
                request.data.learningType = preQuiz_response.Item.learningType;

                quizRepository.fetchQuizData(request, async function(quizError, quizRes){
                    if(quizError){
                        console.log(quizError);
                        callback(quizError, quizRes);
                    } else {
                        console.log("QUIZ RESPONSE : ", quizRes);
                        if(quizRes.Items.length > 0){
                            if(preQuiz_response.Item.learningType === constant.prePostConstans.preLearningVal)
                            {
                                console.log(constant.messages.PRE_QUIZ_ALREADY_GENERATED);
                                callback(400, constant.messages.PRE_QUIZ_ALREADY_GENERATED);
                            }
                            else
                            {
                                let resSelectedTop = [];
                                await quizRes.Items.forEach(qData => {
                                    resSelectedTop = [...resSelectedTop, ...qData.selectedTopics];
                                })

                                console.log("SELECTED TOPICS : ", resSelectedTop);
                                let duplicatedTopics = await checkDuplicateTopics(resSelectedTop, preQuiz_response.Item.selectedTopics);

                                console.log("DUPLICATED TOPICS : ", duplicatedTopics);
                                
                                if(duplicatedTopics.length > 0)
                                {
                                    console.log(constant.messages.POST_QUIZ_ALREADY_GENERATED);
                                    callback(400, constant.messages.POST_QUIZ_ALREADY_GENERATED);
                                }
                                else
                                {
                                    quizRepository.updateQuizStatus(request, function(statusErr,statusRes){
                                        if(statusErr){
                                            callback(statusErr,statusRes);
                                        }
                                        else{
                                            console.log("status updated");
                                            callback(statusErr,statusRes);
                                        }
                                    })
                                }
                            }
                        }
                        else{
                            quizRepository.updateQuizStatus(request, function(statusErr,statusRes){
                                if(statusErr){
                                    callback(statusErr,statusRes);
                                }
                                else{
                                    console.log("status updated");
                                    callback(statusErr,statusRes);
                                }
                            })
                        }             
                    }
                })                               
            }
        })
    }
    else{
        quizRepository.updateQuizStatus(request, function (status_error, status_response) {
            if (status_error) {
                console.log(status_error);
                callback(status_error, status_response);
            } else {
                console.log(status_response);
                callback(status_error, status_response);
            }
        })
    }
}

const checkDuplicateTopics = async (resTopics, checkTopics) => {
    let dupTopics = [];
    await checkTopics.forEach(cArr => {
        dupTopics = [...dupTopics, ...resTopics.filter(resTopics => resTopics.topic_id === cArr.topic_id)];
    })

    return dupTopics;
}

exports.fetchQuizBasedonStatus = (request, callback) => {

    quizRepository.getQuizBasedonStatus(request, async function (fetch_quiz_data_err, fetch_quiz_data_res) {
        if (fetch_quiz_data_err) {
            console.log(fetch_quiz_data_err);
            callback(fetch_quiz_data_err, fetch_quiz_data_res);
        } else {
            callback(fetch_quiz_data_err, fetch_quiz_data_res.Items);
        }
    })
} 


exports.getQuizResult = (request, callback) => {
    quizRepository.getQuizResult(request, function (result_err, result_response) {
        if (result_err) {
            callback(result_err, result_response);
        }
        else {
            if(result_response.Items.length > 0)
            {
                console.log("result_response", result_response.Items[0].answer_metadata);
                console.log("len", result_response.Items[0].answer_metadata.length);

                let contentURL;

                async function setContentURL(index) {

                    if (index < result_response.Items[0].answer_metadata.length) {

                        contentURL = "";

                        if (((JSON.stringify(result_response.Items[0].answer_metadata[index].url).includes("quiz_uploads/")) && (JSON.stringify(result_response.Items[0].answer_metadata[index].url).includes("student_answered_sheets/"))) && result_response.Items[0].answer_metadata[index].url != "" && result_response.Items[0].answer_metadata[index].url != "N.A.") {

                            contentURL = await helper.getS3SignedUrl(result_response.Items[0].answer_metadata[index].url);
                            console.log("contentURL", contentURL);
                            result_response.Items[0].answer_metadata[index]["content_url"] = contentURL;

                            index++;
                            setContentURL(index);
                        } else {
                            index++;
                            setContentURL(index);
                        }

                    } else {

                        console.log("Loop ended!", result_response.Items[0].answer_metadata);
                        callback(result_err, result_response);

                    }
                } setContentURL(0);
            }
            else
            {
                console.log("NO STUDENT RESULT!");
                callback(result_err, result_response);
            }            
        }
    })
}
exports.editStudentQuizMarks = (request, callback) => {

    /** FETCH QUIZ DATA **/
    quizRepository.fetchQuizDataById(request, async function (quizTestErr, quizTestRes) {
        if (quizTestErr) {
            console.log(quizTestErr);
            callback(quizTestErr, quizTestRes);
        } else {
            console.log("QUIZ DATA : ", quizTestRes);
            if(quizTestRes.Item.quiz_status === "Active")
            {
                /** FETCH SCHOOL DATA **/
                schoolRepository.getSchoolDetailsById(request, async(schoolDataErr, SchoolDataRes) => {
                    if(schoolDataErr)
                    {
                        console.log(schoolDataErr);
                        callback(schoolDataErr, SchoolDataRes);
                    }
                    else
                    {
                        let classPassPercentage = 0;
                        if(quizTestRes.Item.learningType == constant.prePostConstans.preLearningVal)
                        {
                            classPassPercentage = Number(SchoolDataRes.Items[0].pre_quiz_config.class_percentage);
                        }
                        else
                        {
                            classPassPercentage = Number(SchoolDataRes.Items[0].post_quiz_config.class_percentage);
                        }

                        let questionIds = request.data.marks_details[0].qa_details.map(qDetails => qDetails.question_id);
              
                        let fetchBulkQtnReq = {
                            IdArray: questionIds,
                            fetchIdName: "question_id",
                            TableName: TABLE_NAMES.upschool_question_table,
                            projectionExp: ["question_id", "marks"]
                        }
                        commonRepository.fetchBulkDataWithProjection(fetchBulkQtnReq, async function (questionDataErr, questionDataRes) {
                            if (questionDataErr) {
                                console.log(questionDataErr);
                                callback(questionDataErr, questionDataRes);
                            } else {
                                console.log("QUESTION DATA : ", questionDataRes);
                                let passStatus = false;

                                await knowPassOrFail(request.data.marks_details[0], questionDataRes.Items, classPassPercentage).then((overallResult) => {
                                    request.data.marks_details[0].totalMark = overallResult.studentResult;
                                    passStatus = overallResult.isPassed;
                                })

                                request.data.passStatus = passStatus;
                                console.log({request});
                                quizRepository.modifyStudentMarks(request, async function (fetch_quiz_data_err, fetch_quiz_data_res) {
                                    if (fetch_quiz_data_err) {
                                        console.log(fetch_quiz_data_err);
                                        callback(fetch_quiz_data_err, fetch_quiz_data_res);
                                    } else {
                                        callback(fetch_quiz_data_err, fetch_quiz_data_res.Items);
                                    }
                                })

                            }
                        })
                    }
                });
                /** END FETCH SCHOOL DATA **/
            }
            else
            {
                console.log(constant.messages.NO_DATA);
                callback(400, constant.messages.NO_DATA);
            }
        }
    })
    /** END FETCH QUIZ DATA **/        
} 


exports.viewQuizQuestionPaper = (request, callback) => {

    quizResultRepository.fetchQuizResultDataOfStudent(request, async function (fetch_quiz_result_data_err, fetch_quiz_result_data_res) {
        if (fetch_quiz_result_data_err) {
            console.log(fetch_quiz_result_data_err);
            callback(fetch_quiz_result_data_err, fetch_quiz_result_data_res);
        } else {
            console.log(fetch_quiz_result_data_res.Items[0]);

            const quizType = fetch_quiz_result_data_res.Items[0].quiz_set;
            const quizSetName = await helper.fetchQuizSetName(quizType);

            quizRepository.fetchQuizDataById(request, function (fetch_quiz_data_err, fetch_quiz_data_response) {
                if (fetch_quiz_data_err) {
                    console.log(fetch_quiz_data_err);
                    callback(fetch_quiz_data_err, fetch_quiz_data_response);
                }
                else {
                    console.log("Quiz OBJ", fetch_quiz_data_response);
                    if (helper.isEmptyObject(fetch_quiz_data_response.Item)) {
                        callback(constant.messages.COULDNOT_READ_QUIZ_ID, 0);
                    }
                    else {

                        const questionsData = fetch_quiz_data_response.Item.quiz_question_details[quizSetName];
                        const questionIDs = helper.removeDuplicates(questionsData);

                        /** FETCH Questions DATA **/
                        let fetchBulkCatReq = {
                            IdArray: questionIDs,
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
                                exports.setQuestionPaperView(questionIDs, fetch_questions_res.Items, async (questionsErr, questionsRes) => {
                                    if (questionsErr) {
                                        console.log(questionsErr);
                                        callback(questionsErr, questionsRes);
                                    }
                                    else {
                                        console.log(questionsRes);
                                        const callbackData = { Items: [] };
                                        callbackData.Items = await questionsRes;
                                        callback(questionsErr, callbackData);
                                    }
                                })
                                /** END SET FINAL Question Paper View DATA **/
                            }
                        })
                        /** END FETCH Questions DATA **/

                    }
                }
            })
        }
    })
}

exports.setQuestionPaperView = (questionIDs, questionData, callback) => {

    let individualQuestion = [];

    async function setQuestionsData(i) {

        if (i < questionIDs.length) {

            const { index, matchedQuestion } = await questionData.reduce((acc, value, currentIndex) => {
                if (value.question_id === questionIDs[i]) {
                    acc.index = currentIndex;
                    acc.matchedQuestion = value;
                }
                return acc;
            }, {});

            individualQuestion.push(matchedQuestion);

            await helper.getAnswerContentFileUrl(individualQuestion[i].answers_of_question)
                .then(url => {
                    individualQuestion[i].answers_of_question = url;
                    questionData[index] = individualQuestion[i];
                    i++;
                    setQuestionsData(i);
                })
                .catch(err => {
                    individualQuestion[i].answers_of_question = "N.A.";
                    questionData[index] = individualQuestion[i];
                    i++;
                    setQuestionsData(i);
                });

        } else {
            callback(0, questionData);
        }
    } setQuestionsData(0);
}

exports.fetchQuizTemplates = (request, callback) => {
    request.data.quiz_status = "Active";
    quizRepository.fetchQuizTemplates(request, async function (quizErr, quizRes) {
        if (quizErr) {
            console.log(quizErr);
            callback(quizErr, quizRes);
        } else {
            console.log("QUIZ DATA : ", quizRes);

            if (quizRes.Items[0].quiz_template_details) {
                for (let k = 97; k <= 99; k++) {
                    let set_code = String.fromCharCode(k);
                    let QnTemp = "set" + set_code + "_QnPaper_temp";
                    let QnUrlcheck = "set" + set_code + "_QuestionUrlCheck";
                    let ansTemp = "set" + set_code + "_ansPaper_temp";
                    let ansUrlcheck = "set" + set_code + "_ansUrlCheck";


                    QnTemp = quizRes.Items[0].quiz_template_details['set_' + set_code]?.question_sheet || "N.A.";
                    QnUrlcheck = constant.quizFolder['questionPapersSet' + set_code.toUpperCase()].split("/")[0];
                    quizRes.Items[0].quiz_template_details['set_' + set_code].question_sheet_url = QnTemp.includes(QnUrlcheck) ? await helper.getS3SignedUrl(QnTemp) : "N.A.";

                    ansTemp = quizRes.Items[0].quiz_template_details['set_' + set_code]?.answer_sheet || "N.A.";
                    ansUrlcheck = constant.quizFolder['questionPapersSet' + set_code.toUpperCase()].split("/")[0];
                    quizRes.Items[0].quiz_template_details['set_' + set_code].answer_sheet_url = ansTemp.includes(ansUrlcheck) ? await helper.getS3SignedUrl(ansTemp) : "N.A.";

                }

            }
            else {
                quizRes.Items[0].quiz_template_details = {}

            }
            callback(quizErr, quizRes);
        }
    })
}


exports.resetQuizEvaluationStatus = (request,callback) => {
    quizResultRepository.resetQuizEvaluationStatus(request, function(quizStatus_error,quizStatus_response){
        if(quizStatus_error){
            console.log(quizStatus_error);
            callback(quizStatus_error,quizStatus_response);
        }
        else{
            callback(quizStatus_error,quizStatus_response);
        }
    })
}
/** EVALUATION API'S **/
exports.startQuizEvaluationProcess = (request, callback) => {
    quizRepository.fetchQuizDataById(request, async function (quizTestErr, quizTestRes) {
        if (quizTestErr) {
            console.log(quizTestErr);
            callback(quizTestErr, quizTestRes);
        } else {
            console.log("QUIZ DATA : ", quizTestRes);
            if(quizTestRes && quizTestRes.Item && quizTestRes.Item.quiz_status === "Active")
            {
                /** FETCH SCHOOL DATA **/
                schoolRepository.getSchoolDetailsById(request, async(schoolDataErr, SchoolDataRes) => {
                    if(schoolDataErr)
                    {
                        console.log(schoolDataErr);
                        callback(schoolDataErr, SchoolDataRes);
                    }
                    else
                    {
                        console.log('School Data: ', SchoolDataRes);
                        let classPassPercentage = 0;
                        if(quizTestRes.Item.learningType == constant.prePostConstans.preLearningVal)
                        {
                            classPassPercentage = Number(SchoolDataRes.Items[0].pre_quiz_config.class_percentage);
                        }
                        else
                        {
                            classPassPercentage = Number(SchoolDataRes.Items[0].post_quiz_config.class_percentage);
                        }

                        /** REST OF THE FLOW **/
                        let quizData = quizTestRes.Item;
                        quizResultRepository.fetchStudentQuiRresultMetadata(request, async function (studentMetaErr, studentMetaRes) {
                            if (studentMetaErr) {
                                console.log(studentMetaErr);
                                callback(studentMetaErr, studentMetaRes);
                            } else {
                                console.log("STUDENT METADATA : ", studentMetaRes);
                                if (studentMetaRes.Items.length > 0) {  
                                    let questionArray = await getQuizQuestionIds(quizData.quiz_question_details);
                                    console.log("OVERALL QUESTIONS IDS : ", questionArray);

                                    /** FETCH CATEGORY DATA **/
                                    let fetchBulkQtnReq = {
                                        IdArray: questionArray,
                                        fetchIdName: "question_id",
                                        TableName: TABLE_NAMES.upschool_question_table,
                                        projectionExp: ["question_id", "question_label", "answers_of_question", "question_content", "question_disclaimer", "question_type", "marks"]
                                    }
                                    commonRepository.fetchBulkDataWithProjection(fetchBulkQtnReq, async function (questionDataErr, questionDataRes) {
                                        if (questionDataErr) {
                                            console.log(questionDataErr);
                                            callback(questionDataErr, questionDataRes);
                                        } else {
                                            console.log("QUESTION DATA : ", questionDataRes);

                                            exports.assigningQuizMarks(studentMetaRes.Items, quizData.quiz_question_details, questionDataRes.Items, classPassPercentage, (markAssignErr, markAssignRes) => {
                                                if(markAssignErr)
                                                {
                                                    console.log(markAssignErr);
                                                    callback(markAssignErr, markAssignRes)
                                                }
                                                else
                                                {
                                                    console.log(markAssignRes);
                                                    
                                                    /** BATCH UPDATE **/
                                                    let resultTable = TABLE_NAMES.upschool_quiz_result;
                                                    commonRepository.bulkBatchWrite(markAssignRes, resultTable, (batchErr, batchRes) => {
                                                        if(batchErr)
                                                        {
                                                            callback(batchErr, batchRes);
                                                        }
                                                        else
                                                        {
                                                            callback(batchErr, 200);
                                                        }
                                                    })
                                                    /** END BATCH UPDATE **/
                                                    // callback(markAssignErr, markAssignRes);
                                                }
                                            })

                                        }
                                    })
                                }
                                else
                                {
                                    console.log(constant.messages.NO_ANSWER_SHEET_FOUND);
                                    callback(400, constant.messages.NO_ANSWER_SHEET_FOUND);
                                }
                            }
                        })
                        /** END REST OF THE FLOW **/
                    }
                })
                /** END FETCH SCHOOL DATA **/                
            }
            else
            {
                console.log(constant.messages.NO_DATA);
                callback(400, constant.messages.NO_DATA);
            }
        }
    })
}

const getQuizQuestionIds = async (quiz_question_details) => {
    let quizSetDetails = constant.quizSetDetails;
    let questionArr = [];

    await quizSetDetails.forEach(indSet => {
        questionArr.push(...quiz_question_details[indSet.setKey]);
    })
    console.log("LENGTH : ", questionArr.length);
    questionArr = await helper.removeDuplicates(questionArr);
    return questionArr;
}

exports.assigningQuizMarks = async (studResultData, quizQuestionSets, quesAns, classPassPercentage, callback) => {
    let quizSets = constant.quizSets;

    /** GET FINAL DATA FORMAT **/
    await helper.getQuizMarksDetailsFormat(quizQuestionSets).then(async (setsMarkFormat) => {
        console.log("SET MARK FORMAT : ", setsMarkFormat);

        /** GET CONCAT ANSWERS **/    
        await helper.concatAnswers(studResultData).then((overallAns) => {
            studResultData = overallAns;
            console.log("CONCAT STUDENT QUIZ ANSWERS : ", studResultData);

            let questionPaper = [];
            let markDetails = [];
            async function studentLoop(i)
            {
                if(i < studResultData.length)
                {
                    questionPaper = quizQuestionSets[quizSets[studResultData[i].quiz_set.toLowerCase()]];
                    markDetails = await setsMarkFormat.filter((markForm, j) => {
                        return markForm.set_key === quizSets[studResultData[i].quiz_set.toLowerCase()]
                    })

                    console.log("QUESTION PAPAER : ", questionPaper);
                    console.log("MARK DETAILS : ", markDetails);

                    if(studResultData[i].overall_answer.length > 0)
                    {
                        await exports.comparingQuizAnswer(studResultData[i].overall_answer, markDetails, questionPaper, quesAns, classPassPercentage).then(async (finalMarksDetails) => {

                            console.log("FINAL MARKS : " + studResultData[i].student_id, finalMarksDetails);
                            studResultData[i].marks_details = finalMarksDetails.markDetails;
                            studResultData[i].isPassed = finalMarksDetails.isPassed;
                            studResultData[i].evaluated = "Yes";
                            studResultData[i].updated_ts = helper.getCurrentTimestamp();
                        })
                    }
                    else
                    {
                        console.log("EMPTY OVERALL ANSWER");
                        studResultData[i].marks_details = markDetails;
                        studResultData[i].isPassed = false;
                        studResultData[i].evaluated = "Yes";
                        studResultData[i].updated_ts = helper.getCurrentTimestamp();
                    }
                    i++;
                    studentLoop(i);
                }
                else
                {
                    console.log("DONE!");
                    console.log(studResultData);
                    callback(0, studResultData);
                }
            }
            studentLoop(0)
        })        
    })    
}

exports.comparingQuizAnswer = async (studAns, markDetails, questionPaper, quesAns, classPassPercentage) => {
    return new Promise(async (resolve, reject) => {
        await helper.splitStudentQuizAnswer(studAns).then((splitedAns) => {
            console.log("SPLITED ANSWER : ", splitedAns);
            // resolve(splitedAns);
            
            let passStatus = false;
            async function sectionLoop(i)
            {
                if(i < markDetails.length)
                {
                    if(splitedAns[i].individualAns && splitedAns[i].individualAns.length > 0)
                    {
                        await classTestServices.setQaDetails(markDetails[i].qa_details, splitedAns[i].individualAns, quesAns).then(async(secQaDetails) => {
                            console.log("SECTION QA DETAILS : ", secQaDetails);
                            markDetails[i].qa_details = secQaDetails;

                            await knowPassOrFail(markDetails[i], quesAns, classPassPercentage).then((overallResult) => {
                                markDetails[i].totalMark = overallResult.studentResult;
                                passStatus = overallResult.isPassed;
                            })
                        })
                    }                    
                    i++;
                    sectionLoop(i);
                }
                else
                {
                    /** LOOP END **/
                    console.log("End comparingAnswer");
                    console.log("OVERALL QA DETAILS : ", markDetails);

                    resolve({ markDetails, isPassed: passStatus });                  
                    
                    /** Send mark_details of one student*/
                }
            }
            sectionLoop(0);
        })  
    })
}

const knowPassOrFail = (marks_details, quesAndAns, individualPassPercentage) => {

    return new Promise((resolve, reject) => {
        individualPassPercentage = 50;
        let totalMarks = quesAndAns?.reduce((acc, item) => {
            return item.marks ? acc + Number(item.marks) : acc;
        }, 0);       
    
        const studentResult = marks_details?.qa_details?.filter(studentProgress => {
            return quesAndAns.some(question => question?.question_id === studentProgress?.question_id);
        }).reduce((acc, item) =>  {
            console.log(item?.obtained_marks);
            return acc + item?.obtained_marks
        }, 0);
     
        const isPassed = studentResult >= individualPassPercentage;
        console.log(isPassed);
        console.log({ totalMarks });
        console.log({ studentResult });

        resolve({isPassed, studentResult});
    })
};
exports.comparingQuizAnswer = async (markDetails, quesAns, individualPassPercentage) => {
    const qaDetails = markDetails.qa_details;

    let totalObtainedMarks = 0;

    quesAns.forEach(ques => {
        const matchingDetail = qaDetails.find(detail => detail.question_id === ques.question_id);
        if (matchingDetail) {
            totalObtainedMarks += matchingDetail.obtained_marks > ques.marks ? ques.marks : matchingDetail.obtained_marks;
        }
    });

    const totalMarks = (totalObtainedMarks / quesAns.reduce((acc, cur) => acc + cur.marks, 0)) * 100; 

    // Compare the calculated percentage with the individual pass percentage
    const pass = totalMarks >= individualPassPercentage;

    return pass ? "Pass" : "Fail";
}



