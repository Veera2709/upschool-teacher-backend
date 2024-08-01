const dynamoDbCon = require('../awsConfig');
const conceptRepository = require("../repository/conceptRepository");
const digicardRepository = require("../repository/digicardRepository");
const classTestRepository = require("../repository/classTestRepository");
const testQuestionPaperRepository = require("../repository/testQuestionPaperRepository");
const commonRepository = require("../repository/commonRepository");
const blueprintRepository = require("../repository/blueprintRepository");
const classRepository = require("../repository/classRepository");
const subjectRepository = require("../repository/subjectRepository");
const sectionRepository = require("../repository/sectionRepository");
const testResultRepository = require("../repository/testResultRepository");
const commonServices = require("../services/commonServices");
const { TABLE_NAMES } = require('../constants/tables');
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const qs = require('qs');
const axios = require('axios');
const ocrServices = require('./ocrServices');
const { resolve } = require('bluebird');

exports.addClassTest = (request, callback) => {

    classTestRepository.fetchClassTestByName(request, function (fetch_class_test_err, fetch_class_test_res) {
        if (fetch_class_test_err) {
            console.log(fetch_class_test_err);
            callback(fetch_class_test_err, fetch_class_test_res);
        } else {
            if (fetch_class_test_res.Items.length === 0) {
                request.data.class_test_id = helper.getRandomString();
                // Call API in EC2 Service and get Question and Answer Paper Paths : 
                const options = {
                    method: 'POST',
                    headers: { 'content-type': 'application/x-www-form-urlencoded' },
                    data: qs.stringify(request),
                    url: process.env.PDF_GENERATION_URL + '/createQuestionAndAnswerPapers',
                };

                console.log("process.env.PDF_GENERATION_URL : ", process.env.PDF_GENERATION_URL);
                // console.log("OPTIONS : ", options);

                axios(options).then((pdfData) => {
                    // insert data into the table : 
                    request.data.answer_sheet_template = pdfData.data.answer_sheet_template;
                    request.data.question_paper_template = pdfData.data.question_paper_template;
                    console.log("pdfData : ", pdfData.data);

                    console.log("FINAL INSERT REQUEST : ", request.data);
                    classTestRepository.insertClassTest(request, function (add_class_test_err, add_class_test_res) {
                        if (add_class_test_err) {
                            console.log(add_class_test_err);
                            callback(add_class_test_err, add_class_test_res);
                        } else {
                            console.log("CLASS TEST SCHEDULED!");
                            callback(add_class_test_err, add_class_test_res);
                        }
                    })

                }).catch((err) => {
                    console.log("Errror in EC2 : ", err);
                    callback(400, err)
                })

            } else {
                callback(400, constant.messages.CLASS_TEST_EXISTS);
            }
        }
    })
}

exports.fetchClassTestsBasedonStatus = (request, callback) => {

    classTestRepository.getClassTestsBasedonStatus(request, async function (fetch_class_test_err, fetch_class_test_res) {
        if (fetch_class_test_err) {
            console.log(fetch_class_test_err);
            callback(fetch_class_test_err, fetch_class_test_res);
        } else {
            callback(fetch_class_test_err, fetch_class_test_res.Items);
        }
    })
}

exports.getClassTestbyId = (request, callback) => {
    request.data.class_test_status = "Active";
    classTestRepository.getClassTestIdAndName(request, async function (classTestErr, classTestRes) {
        if (classTestErr) {
            console.log(classTestErr);
            callback(classTestErr, classTestRes);
        } else {
            console.log("CLASS TEST DATA : ", classTestRes);
            let questionPaperTEmp = classTestRes.Items[0].question_paper_template ? classTestRes.Items[0].question_paper_template : "N.A.";
            let answerSheetTemp = classTestRes.Items[0].answer_sheet_template ? classTestRes.Items[0].answer_sheet_template : "N.A.";

            let questionUrlCheck = constant.testFolder.questionPapers.split("/")[0];
            let answerUrlCheck = constant.testFolder.answerSheets.split("/")[0];

            classTestRes.Items[0].question_paper_template_url = questionPaperTEmp.includes(questionUrlCheck) ? await helper.getS3SignedUrl(questionPaperTEmp) : "N.A.";

            classTestRes.Items[0].answer_sheet_template_url = answerSheetTemp.includes(answerUrlCheck) ? await helper.getS3SignedUrl(answerSheetTemp) : "N.A.";

            callback(classTestErr, classTestRes);

        }
    })
}

exports.startEvaluationProcess = (request, callback) => {
    request.data.class_test_status = "Active";
    classTestRepository.getClassTestIdAndName(request, async function (classTestErr, classTestRes) {
        if (classTestErr) {
            console.log(classTestErr);
            callback(classTestErr, classTestRes);
        } else {
            console.log("CLASS TEST DATA : ", classTestRes);
            if (classTestRes.Items.length > 0) {
                let classTest = classTestRes.Items[0];
                testResultRepository.fetchStudentresultMetadata(request, async function (studentMetaErr, studentMetaRes) {
                    if (studentMetaErr) {
                        console.log(studentMetaErr);
                        callback(studentMetaErr, studentMetaRes);
                    } else {
                        console.log("STUDENT METADATA : ", studentMetaRes);
                        if (studentMetaRes.Items.length > 0) {
                            /** FETCH QUESTION PAPER **/
                            request.data.question_paper_id = classTest.question_paper_id;
                            testQuestionPaperRepository.fetchTestQuestionPaperByID(request, async function (questionPaperErr, questionPaperRes) {
                                if (questionPaperErr) {
                                    console.log(questionPaperErr);
                                    callback(questionPaperErr, questionPaperRes);
                                } else {
                                    console.log("QUESTION PAPER : ", questionPaperRes.Items);

                                    let questionArray = [];
                                    await questionPaperRes.Items[0].questions.forEach((e) => questionArray.push(...e.question_id))
                                    console.log("QUESTION IDS : ", questionArray);

                                    /** FETCH CATEGORY DATA **/
                                    let fetchBulkQtnReq = {
                                        IdArray: questionArray,
                                        fetchIdName: "question_id",
                                        TableName: TABLE_NAMES.upschool_question_table,
                                        projectionExp: ["question_id", "question_label", "answers_of_question", "question_content", "question_disclaimer", "question_type"]
                                    }
                                    commonRepository.fetchBulkDataWithProjection(fetchBulkQtnReq, async function (questionDataErr, questionDataRes) {
                                        if (questionDataErr) {
                                            console.log(questionDataErr);
                                            callback(questionDataErr, questionDataRes);
                                        } else {
                                            console.log("QUESTION DATA : ", questionDataRes);

                                            exports.assigningMarks(studentMetaRes.Items, questionPaperRes.Items[0], questionDataRes.Items, (markAssignErr, markAssignRes) => {
                                                if(markAssignErr)
                                                {
                                                    console.log(markAssignErr);
                                                    callback(markAssignErr, markAssignRes)
                                                }
                                                else
                                                {
                                                    console.log(markAssignRes);

                                                    /** BATCH UPDATE **/
                                                    let resultTable = TABLE_NAMES.upschool_test_result;
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
                            })
                            /** END FETCH QUESTION PAPER **/
                        }
                        else {
                            console.log(constant.messages.NO_ANSWER_SHEET_FOUND);
                            callback(400, constant.messages.NO_ANSWER_SHEET_FOUND);
                        }
                    }
                })
            }
            else {
                console.log(constant.messages.NO_DATA);
                callback(400, constant.messages.NO_DATA);
            }
        }
    })
}

exports.assigningMarks = async (studResultData, questionPaper, quesAns, callback) => {
    /** GET FINAL DATA FORMAT **/
    await helper.getMarksDetailsFormat(questionPaper.questions).then(async (markDetails) => {
        console.log("STUDENT RESULT STRUCTURE : ", markDetails);
        /** GET CONCAT ANSWERS **/    
        await helper.concatAnswers(studResultData).then((overallAns) => {
            studResultData = overallAns;
            console.log("CONCAT STUDENT ANSWERS : ", studResultData);

            async function studentLoop(i)
            {
                if(i < studResultData.length)
                {
                    if(studResultData[i].overall_answer.length > 0)
                    {
                        await exports.comparingAnswer(studResultData[i].overall_answer, markDetails, questionPaper, quesAns).then(async (finalMarks) => {
                            console.log("FINAL MARKS : " + studResultData[i].student_id, finalMarks);
                            studResultData[i].marks_details = finalMarks;
                            studResultData[i].evaluated = "Yes";
                            studResultData[i].updated_ts = helper.getCurrentTimestamp();
                        })
                    }
                    else
                    {
                        console.log("EMPTY OVERALL ANSWER");
                        studResultData[i].marks_details = markDetails;
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
                    // send studResultData in callback
                }
            }
            studentLoop(0)
        })             
        /** END GET CONCAT ANSWER **/
    })     
    
    /** GET FINAL DATA FORMAT **/
}

exports.comparingAnswer = async (studAns, markDetails, questionPaper, quesAns) => {
    return new Promise(async (resolve, reject) => {
        await helper.splitSectionAnswer(studAns, questionPaper.questions).then((splitedAns) => {
            console.log("SPLITED ANSWER : ", splitedAns);
            // resolve(splitedAns);
            
            async function sectionLoop(i)
            {
                if(i < markDetails.length)
                {
                    if(splitedAns[i].individualAns && splitedAns[i].individualAns.length > 0)
                    {
                        await exports.setQaDetails(markDetails[i].qa_details, splitedAns[i].individualAns, quesAns).then((secQaDetails) => {
                            console.log("SECTION QA DETAILS : ", secQaDetails);
                            markDetails[i].qa_details = secQaDetails;
                        })
                    }                    
                    i++;
                    sectionLoop(i);
                }
                else
                {
                    /** LOOP END **/
                    console.log("OVERALL QA DETAILS : ", markDetails);

                    /** call another function to calculate pass and fail mark **/

                    resolve(markDetails);
                    /** Send mark_details of one student*/
                }
            }
            sectionLoop(0);
        })  
    })
}

exports.setQaDetails = (qaDetails, indAns, quesAns) => {
    let localQuestion = "";
    let localType = "";
    
    return new Promise(async (resolve, reject) => {
        async function qaLoop(i)
        {
            if(i < qaDetails.length)
            {
 
                localQuestion = quesAns.filter(ques => ques.question_id === qaDetails[i].question_id);
 
                if(localQuestion.length > 0 && indAns[i])
                {
                    await exports.compareAnswer(localQuestion[0], indAns[i],).then((obMark) => {
                        console.log("OBTAINED MARKS : ", obMark);
                        qaDetails[i].obtained_marks = obMark;
                        qaDetails[i].student_answer = indAns[i];
                    })
                }
                i++;
                qaLoop(i);
            }
            else
            {
                console.log("End setQaDetails");
                resolve(qaDetails);
            }          
        }
        qaLoop(0)
    })
}

exports.compareAnswer = (question, studAns) => {
    return new Promise(async (resolve, reject) => {
        let multiAns = await studAns.split(constant.evalConstant.splitLines).filter(emptyEle => emptyEle !== "");
        if(question.question_type === constant.questionKeys.objective)
        {
            /** OBJECTIVE **/
            await helper.getIndexOfStudentAns(multiAns).then(async(studentAnswer) => { 

                console.log("STUDENT ANSWER : ", studentAnswer);
                await helper.getOptionsWrightAnswers(question.answers_of_question).then(async (correctAns) => {
                    console.log("CORRECT ANSWER : ", correctAns);

                    (async () => {
                        await helper.getObjectiveMarks(correctAns, studentAnswer).then(async (scoredMark) => {
                            console.log("OBJECTIVE MARK : ", scoredMark);
                            resolve(scoredMark > question.marks ? question.marks : scoredMark);
                        })
                    })();
                })
            })            
            /** END OBJECTIVE **/
        }
        else if(question.question_type === constant.questionKeys.subjective)
        {            
            /** SUBJECTIVE **/
            await exports.subjectiveAnswerCorrection(question.answers_of_question, multiAns, question.question_content).then(async(scoredMark) => { 
                console.log("SUBJECTIVE MARK : ", scoredMark);
                resolve(scoredMark > question.marks ? question.marks : scoredMark);
            })
            /** END SUBJECTIVE **/
        }
        else
        {
            /** DESCRIPTIVE **/
            await exports.descriptiveAnswerCorrection(question.answers_of_question, studAns).then(async(scoredMark) => { 
                console.log("DESCRIPTIVE MARK : ", scoredMark);
                resolve(scoredMark > question.marks ? question.marks : scoredMark);
            })
            /** END DESCRIPTIVE **/
        }
    })
}

exports.descriptiveAnswerCorrection = async (answersOfQuestion, studentAns) => {
    return new Promise(async (resolve, reject) => {
        let totalMarks = 0;
        await answersOfQuestion.forEach((dAns, i) => {
            if(studentAns.toLowerCase().replace(/ /g,'').includes(dAns.answer_content.toLowerCase().replace(/ /g,'')))
            {
                totalMarks += Number(dAns.answer_weightage);
            }
        })
        resolve(totalMarks);
    })
}

exports.subjectiveAnswerCorrection = async (answersOfQuestion, studentAnsArr, questionContent) => {
    return new Promise(async (resolve, reject) => {
        let blankAns = "";
        let totalMarks = 0;

        let reg = new RegExp((constant.answerSheet.findBlank) + ("(.*?)") + (constant.answerSheet.findBlank), 'g');
        let blanklist = (questionContent.match(reg) || []);
        await blanklist.forEach(async (bName, i) => {
            blankAns = await answersOfQuestion.filter(bAns => bAns.answer_option === bName);
            if(blankAns.length > 0 && studentAnsArr[i])
            {
                totalMarks += blankAns[0].answer_content.toLowerCase().replace(/ /g,'') == studentAnsArr[i].replace(/^,/, '').toLowerCase().replace(/ /g,'') ? Number(blankAns[0].answer_weightage) : 0;
            }            
        })

        resolve(totalMarks);
    })
}

exports.readStudentAnswerSheets = (request, callback) => {

    function entireStudentsData(i) {

        if (i < request.Items.length) {

            function eachStudentData(j) {

                if (j < request.Items[i].answer_metadata.length) {

                    console.log(request.Items[i].answer_metadata[j].url);

                    let key = {
                        data: {
                            Key: request.Items[i].answer_metadata[j].url
                        }
                    }

                    ocrServices.readScannedPage(key, async function (scannedErr, scannedRes) {
                        if (scannedErr) {
                            console.log(scannedErr);
                            // callback(scannedErr, scannedRes);
                            j++;
                            eachStudentData(j);
                        } else {
                            console.log("SCANNED RESPONSE : ", scannedRes);
                            let words = await helper.formattingAnswer(scannedRes.data.text);

                            console.log("words", words);
                            request.Items[i].answer_metadata[j]['studentAnswer'] = words;
                            j++;
                            eachStudentData(j);
                        }
                    });
                } else {
                    i++;
                    entireStudentsData(i);
                }

            } eachStudentData(0);

        } else {

            console.log("Loop Ended!", request);
            callback(0, request);

        }

    } entireStudentsData(0);
}

exports.fetchGetStudentData = (request, callback) => {

    classTestRepository.getStudentInfo(request, async function (fetch_student_err, fetch_student_res) {
        if (fetch_student_err) {
            console.log(fetch_student_err);
            callback(fetch_student_err, fetch_student_res);
        } else {
            callback(fetch_student_err, fetch_student_res.Items);
        }
    })
}

exports.getResult = (request, callback) => {
    classRepository.getResult(request, function (result_err, result_response) {
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

                        if (((JSON.stringify(result_response.Items[0].answer_metadata[index].url).includes("test_uploads/")) && (JSON.stringify(result_response.Items[0].answer_metadata[index].url).includes("student_answered_sheets/"))) && result_response.Items[0].answer_metadata[index].url != "" && result_response.Items[0].answer_metadata[index].url != "N.A.") {

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
exports.changeStudentMarks = (request, callback) => {
    if (request === undefined || request.data === undefined || request.data.result_id === undefined || request.data.marks_details === undefined || !Array.isArray(request.data.marks_details) || request.data.marks_details.length === 0) {
        callback(400, constant.messages.INVALID_REQUEST_FORMAT);
    } else {
        classRepository.modifyStudentMarks(request, function (result_err, result_response) {
            if (result_err) {
                console.log(result_err);
                callback(result_err, result_response);
            }
            else {
                console.log(result_response);
                callback(result_err, result_response);
            }
        })
    }
}

exports.resetResultEvaluateStatus = (request, callback) => {
    testResultRepository.changeTestEvaluationStatus(request, function (resetStatusErr, resetStatusRes) {
        if (resetStatusErr) {
            console.log(resetStatusErr);
            callback(resetStatusErr, resetStatusRes);
        }
        else {
            console.log(resetStatusRes);
            callback(resetStatusErr, resetStatusRes);
        }
    })
}

 exports.updateClassTestStatus = (request, callback) => {
    classTestRepository.updateClassTestStatus(request, function(testStatus_error,testStatus_response){
        if(testStatus_error){
            console.log(testStatus_error);
            callback(testStatus_error,testStatus_response);
        }else{
            console.log(testStatus_response);
            callback(testStatus_error,testStatus_response);
        }
    })
 }