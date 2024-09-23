const quizRepository = require("../repository/quizRepository");
const quizResultRepository = require("../repository/quizResultRepository");
const classTestServices = require("./classTestServices");
const constant = require("../constants/constant");
const helper = require('../helper/helper');
const { request } = require("http");
const commonRepository = require("../repository/commonRepository");
const { TABLE_NAMES } = require('../constants/tables');
const schoolRepository = require("../repository/schoolRepository");
const studentRepository = require("../repository/studentRepository");
const classTestRepository = require("../repository/classTestRepository");

exports.checkDuplicateQuizName = async (request) => {
    const quizData_response = await quizRepository.checkDuplicateQuizName2(request)
    if (quizData_response.Items.length > 0) {
        throw helper.formatErrorResponse(constant.messages.DUPLICATE_QUIZ_NAME, 400);
    }
    return quizData_response
}

exports.updateQuizStatus = async (request) => {
    if (request.data.quiz_status !== constant.status.active) {
        return await quizRepository.updateQuizStatus2(request);
    }

    const preQuiz_response = await quizRepository.fetchQuizDataById2(request);
    if (!preQuiz_response.Item) throw new Error('Error fetching preQuiz data');

    const { client_class_id, chapter_id, subject_id, section_id, learningType, selectedTopics } = preQuiz_response.Item;
    Object.assign(request.data, { client_class_id, chapter_id, subject_id, section_id, learningType });

    const quizRes = await quizRepository.fetchQuizData2(request);
    if (quizRes.Items.length > 0) {
        if (learningType === constant.prePostConstans.preLearningVal) {
            throw new Error(constant.messages.PRE_QUIZ_ALREADY_GENERATED);
        }

        const resSelectedTop = quizRes.Items.flatMap(qData => qData.selectedTopics);
        const duplicatedTopics = await checkDuplicateTopics(resSelectedTop, selectedTopics);

        if (duplicatedTopics.length > 0) {
            throw new Error(constant.messages.POST_QUIZ_ALREADY_GENERATED);
        }
    }

    const statusRes = await quizRepository.updateQuizStatus2(request);
    console.log("status updated");
    return statusRes;
};


const checkDuplicateTopics = async (resTopics, checkTopics) => {
    let dupTopics = [];
    await checkTopics.forEach(cArr => {
        dupTopics = [...dupTopics, ...resTopics.filter(resTopics => resTopics.topic_id === cArr.topic_id)];
    })

    return dupTopics;
}

exports.fetchQuizBasedonStatus = async (request) => await quizRepository.getQuizBasedonStatus2(request)



exports.getQuizResult = async (request) => {
    const result_response = await quizRepository.getQuizResult2(request)

    if (result_response.Items.length > 0) {
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
            }
        } setContentURL(0);
    }    
    return result_response;
}


exports.editStudentQuizMarks = async (request) => {
    try {
        const quizTestRes = await quizRepository.fetchQuizDataById2(request);

        if (quizTestRes.Item.quiz_status !== "Active") {
            throw helper.formatErrorResponse(constant.messages.NO_DATA, 400);
        }

        const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

        let classPassPercentage = 0;
        if (quizTestRes.Item.learningType === constant.prePostConstans.preLearningVal) {
            classPassPercentage = Number(schoolDataRes.Items[0].pre_quiz_config.class_percentage);
        } else {
            classPassPercentage = Number(schoolDataRes.Items[0].post_quiz_config.class_percentage);
        }

        const questionIds = request.data.marks_details[0].qa_details.map(qDetails => qDetails.question_id);
        const fetchBulkQtnReq = {
            IdArray: questionIds,
            fetchIdName: "question_id",
            TableName: TABLE_NAMES.upschool_question_table,
            projectionExp: ["question_id", "marks"]
        };
        const quizIds = fetchBulkQtnReq.IdArray.map((val) => ({ question_id: val }));
        const questionDataRes = await commonRepository.fetchBulkDataWithProjection2({ items: quizIds, condition: "OR" })

        const overallResult = await knowPassOrFail(request.data.marks_details[0], questionDataRes.Items, classPassPercentage);
        request.data.marks_details[0].totalMark = overallResult.studentResult;
        request.data.passStatus = overallResult.isPassed;

        const fetchQuizDataRes = await quizRepository.modifyStudentMarks2(request);
        return fetchQuizDataRes.Items;

    } catch (error) {
        console.log(error);
        throw helper.formatErrorResponse(error.message || constant.messages.NO_DATA, 400);
    }
};



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

exports.fetchQuizTemplates = async (request) => {
    try {
        request.data.quiz_status = "Active";
        const quizRes = await quizRepository.fetchQuizTemplates2(request);
        console.log("QUIZ DATA:", quizRes);

        if (quizRes.Items[0]?.quiz_template_details) {
            for (let k = 97; k <= 99; k++) {
                const set_code = String.fromCharCode(k);
                const questionSheetKey = `set_${set_code}`;
                const quizTemplate = quizRes.Items[0].quiz_template_details[questionSheetKey] || {};

                const questionTemp = quizTemplate.question_sheet || "N.A.";
                const questionUrlCheck = constant.quizFolder[`questionPapersSet${set_code.toUpperCase()}`].split("/")[0];
                quizTemplate.question_sheet_url = questionTemp.includes(questionUrlCheck)
                    ? await helper.getS3SignedUrl(questionTemp)
                    : "N.A.";

                const answerTemp = quizTemplate.answer_sheet || "N.A.";
                const answerUrlCheck = constant.quizFolder[`questionPapersSet${set_code.toUpperCase()}`].split("/")[0];
                quizTemplate.answer_sheet_url = answerTemp.includes(answerUrlCheck)
                    ? await helper.getS3SignedUrl(answerTemp)
                    : "N.A.";
            }
        } else {
            quizRes.Items[0].quiz_template_details = {};
        }

        return quizRes;
    } catch (error) {
        console.log(error);
        throw helper.formatErrorResponse(error.message, 400);
    }
};



exports.resetQuizEvaluationStatus = async (request) => await quizResultRepository.resetQuizEvaluationStatus2(request)


/** EVALUATION API'S **/

function addIndividualGroupPerformance(markAssignRes, questionDataRes, group_pass_percentage) {
    console.log("questionDataRes", questionDataRes);
    const questionMarksMap = {};

    questionDataRes?.Items?.forEach(question => {
        if (question.question_id && typeof question.marks === 'number') {
            questionMarksMap[question.question_id] = question.marks;
        }
    });

    console.log("questionMarksMap", questionMarksMap);

    // Convert group pass percentages to decimal thresholds
    const basicThreshold = group_pass_percentage.Basic / 100;
    const intermediateThreshold = group_pass_percentage.Intermediate / 100;
    const advancedThreshold = group_pass_percentage.Advanced / 100;

    markAssignRes.forEach(res => {
        let basicQuestions = 0, basicMarks = 0, basicObtained = 0;
        let intermediateQuestions = 0, intermediateMarks = 0, intermediateObtained = 0;
        let advancedQuestions = 0, advancedMarks = 0, advancedObtained = 0;

        res.marks_details.forEach(markDetail => {
            markDetail.qa_details.forEach((question) => {
                const marksPerQuestion = questionMarksMap[question.question_id] || 0;
                switch (question.type) {
                    case 'basic':
                        basicQuestions += 1;
                        basicMarks += marksPerQuestion;
                        basicObtained += question.obtained_marks;
                        break;
                    case 'intermediate':
                        intermediateQuestions += 1;
                        intermediateMarks += marksPerQuestion;
                        intermediateObtained += question.obtained_marks;
                        break;
                    case 'advanced':
                        advancedQuestions += 1;
                        advancedMarks += marksPerQuestion;
                        advancedObtained += question.obtained_marks;
                        break;
                }
            });
        });

        const individualGroupPerformance = {
            Basic: {
                Ispassed: basicObtained >= basicMarks * basicThreshold,
                no_of_questions: basicQuestions,
                total_mark: basicMarks,
                total_obtained_mark: basicObtained
            },
            Intermediate: {
                Ispassed: intermediateObtained >= intermediateMarks * intermediateThreshold,
                no_of_questions: intermediateQuestions,
                total_mark: intermediateMarks,
                total_obtained_mark: intermediateObtained
            },
            Advanced: {
                Ispassed: advancedObtained >= advancedMarks * advancedThreshold,
                no_of_questions: advancedQuestions,
                total_mark: advancedMarks,
                total_obtained_mark: advancedObtained
            }
        };

        // Add the individualGroupPerformance object to the res object
        res.individual_group_performance = individualGroupPerformance;
    });

    return markAssignRes;
}


exports.startQuizEvaluationProcess = (request, callback) => {
    quizRepository.fetchQuizDataById(request, async function (quizTestErr, quizTestRes) {
        if (quizTestErr) {
            console.log(quizTestErr);
            callback(quizTestErr, quizTestRes);
        } else {
            console.log("QUIZ DATA : ", quizTestRes);
            if (quizTestRes && quizTestRes.Item && quizTestRes.Item.quiz_status === "Active") {
                /** FETCH SCHOOL DATA **/
                schoolRepository.getSchoolDetailsById(request, async (schoolDataErr, SchoolDataRes) => {
                    if (schoolDataErr) {
                        console.log(schoolDataErr);
                        callback(schoolDataErr, SchoolDataRes);
                    }
                    else {
                        console.log('School Data: ', SchoolDataRes);
                        let classPassPercentage = 0;
                        let group_pass_percentage = 0;

                        if (quizTestRes.Item.learningType == constant.prePostConstans.preLearningVal) {
                            classPassPercentage = Number(SchoolDataRes.Items[0].pre_quiz_config.class_percentage);
                            group_pass_percentage = Number(SchoolDataRes.Items[0].pre_quiz_config.group_pass_percentage);
                        } else {
                            classPassPercentage = Number(SchoolDataRes.Items[0].post_quiz_config.class_percentage);
                            group_pass_percentage = Number(SchoolDataRes.Items[0].post_quiz_config.group_pass_percentage);

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
                                            console.log("quizData.quiz_question_details", questionDataRes.Items);
                                            exports.assigningQuizMarks(studentMetaRes.Items, quizData.quiz_question_details, questionDataRes.Items, classPassPercentage, group_pass_percentage, quizData.question_track_details, (markAssignErr, markAssignRes) => {
                                                if (markAssignErr) {
                                                    console.log(markAssignErr);
                                                    callback(markAssignErr, markAssignRes)
                                                }
                                                else {
                                                    // console.log("markAssignRes1",markAssignRes);
                                                    //  console.log("markAssignRes",markAssignRes[0].marks_details[0].qa_details);
                                                    markAssignRes = addIndividualGroupPerformance(markAssignRes, questionDataRes, group_pass_percentage);
                                                    console.log("test ok", markAssignRes);
                                                    //  console.log(JSON.stringify(markAssignRes, null, 2));


                                                    /** BATCH UPDATE **/
                                                    let resultTable = TABLE_NAMES.upschool_quiz_result;
                                                    commonRepository.bulkBatchWrite(markAssignRes, resultTable, (batchErr, batchRes) => {
                                                        if (batchErr) {
                                                            callback(batchErr, batchRes);
                                                        }
                                                        else {
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
                                else {
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
            else {
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

exports.assigningQuizMarks = async (studResultData, quizQuestionSets, quesAns, classPassPercentage, group_pass_percentage, question_track_details, callback) => {
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
            async function studentLoop(i) {
                if (i < studResultData.length) {
                    questionPaper = quizQuestionSets[quizSets[studResultData[i].quiz_set.toLowerCase()]];
                    let questionPaperTrack = question_track_details[quizSets[studResultData[i].quiz_set.toLowerCase()]];

                    markDetails = await setsMarkFormat.filter((markForm, j) => {
                        return markForm.set_key === quizSets[studResultData[i].quiz_set.toLowerCase()]
                    })

                    console.log("QUESTION PAPAER : ", questionPaper);
                    console.log("MARK DETAILS : ", markDetails);

                    if (studResultData[i].overall_answer.length > 0) {
                        await exports.comparingQuizAnswer(studResultData[i].overall_answer, markDetails, questionPaper, quesAns, classPassPercentage, group_pass_percentage, questionPaperTrack).then(async (finalMarksDetails) => {

                            console.log("FINAL MARKS : " + studResultData[i].student_id, finalMarksDetails);
                            studResultData[i].marks_details = finalMarksDetails.markDetails;
                            studResultData[i].isPassed = finalMarksDetails.isPassed;
                            studResultData[i].evaluated = "Yes";
                            studResultData[i].updated_ts = helper.getCurrentTimestamp();
                        })
                    }
                    else {
                        console.log("EMPTY OVERALL ANSWER");
                        studResultData[i].marks_details = markDetails;
                        studResultData[i].isPassed = false;
                        studResultData[i].evaluated = "Yes";
                        studResultData[i].updated_ts = helper.getCurrentTimestamp();
                    }
                    i++;
                    studentLoop(i);
                }
                else {
                    console.log("DONE!");
                    console.log(studResultData);
                    callback(0, studResultData);
                }
            }
            studentLoop(0)
        })
    })
}

exports.comparingQuizAnswer = async (studAns, markDetails, questionPaper, quesAns, classPassPercentage, group_pass_percentage, questionPaperTrack) => {
    return new Promise(async (resolve, reject) => {
        await helper.splitStudentQuizAnswer(studAns).then((splitedAns) => {
            console.log("SPLITED ANSWER : ", splitedAns);

            let passStatus = false;

            async function sectionLoop(i) {
                if (i < markDetails.length) {
                    if (splitedAns[i] && splitedAns[i].individualAns && splitedAns[i].individualAns.length > 0) {
                        await exports.setQizQaDetails(markDetails[i].qa_details, splitedAns[i].individualAns, quesAns, questionPaperTrack).then(async (secQaDetails) => {
                            console.log("SECTION QA DETAILS : ", secQaDetails);
                            markDetails[i].qa_details = secQaDetails;

                            await knowPassOrFail(markDetails[i], quesAns, classPassPercentage, group_pass_percentage).then((overallResult) => {
                                markDetails[i].totalMark = overallResult.studentResult;
                                passStatus = overallResult.isPassed;
                            });
                        });
                    }

                    i++;
                    sectionLoop(i);
                } else {
                    /** LOOP END **/
                    console.log("End comparingAnswer");
                    console.log("OVERALL QA DETAILS : ", markDetails);

                    resolve({ markDetails, isPassed: passStatus });
                }
            }

            sectionLoop(0);
        }).catch((error) => {
            console.error("Error in splitStudentQuizAnswer:", error);
            reject(error);
        });
    });
};


exports.setQizQaDetails = (qaDetails, indAns, quesAns, questionPaperTrack) => {
    let localQuestion = "";
    let localType = "";
    console.log("checkedtrack", questionPaperTrack);
    return new Promise(async (resolve, reject) => {
        async function qaLoop(i) {
            if (i < qaDetails.length) {

                localQuestion = quesAns.filter(ques => ques.question_id === qaDetails[i].question_id);

                localType = questionPaperTrack.filter(ques => ques.question_id === qaDetails[i].question_id);
                if (localQuestion.length > 0 && indAns[i]) {
                    await classTestServices.compareAnswer(localQuestion[0], indAns[i],).then((obMark) => {
                        console.log("OBTAINED MARKS : ", obMark);
                        qaDetails[i].obtained_marks = obMark;
                        qaDetails[i].student_answer = indAns[i];
                        qaDetails[i].type = localType[0].type;
                    })
                }
                i++;
                qaLoop(i);
            }
            else {
                console.log("End setQaDetails");
                resolve(qaDetails);
            }
        }
        qaLoop(0)
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
        }).reduce((acc, item) => {
            console.log(item?.obtained_marks);
            return acc + item?.obtained_marks
        }, 0);

        const isPassed = studentResult >= individualPassPercentage;
        console.log(isPassed);
        console.log({ totalMarks });
        console.log({ studentResult });

        resolve({ isPassed, studentResult });
    })
};

exports.fetchAllQuizDetails = function (request, callback) {
    /** FETCH USER BY EMAIL **/
    quizRepository.getAllQuizData(request, function (fetch_quiz_err, fetch_quiz_response) {
        if (fetch_quiz_err) {
            console.log(fetch_quiz_err);
            callback(fetch_quiz_err, fetch_quiz_response);
        } else {
            callback(0, fetch_quiz_response)
        }
    })
}


// exports.comparingQuizAnswer = async (markDetails, quesAns, individualPassPercentage) => {
//     const qaDetails = markDetails.qa_details;

//     let totalObtainedMarks = 0;

//     quesAns.forEach(ques => {
//         const matchingDetail = qaDetails.find(detail => detail.question_id === ques.question_id);
//         if (matchingDetail) {
//             totalObtainedMarks += matchingDetail.obtained_marks > ques.marks ? ques.marks : matchingDetail.obtained_marks;
//         }
//     });

//     const totalMarks = (totalObtainedMarks / quesAns.reduce((acc, cur) => acc + cur.marks, 0)) * 100;

//     // Compare the calculated percentage with the individual pass percentage
//     const pass = totalMarks >= individualPassPercentage;

//     return pass ? "Pass" : "Fail";
// }



