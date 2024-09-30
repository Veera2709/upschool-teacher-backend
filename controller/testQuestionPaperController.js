const {testQuestionPaperServices} = require("../services");
const constants = require("../constants/constant");
const { formatResponse } = require("../helper/helper");

exports.fetchTestQuestionPapersBasedonStatus = (req, res, next) => {
    console.log("fetchTestQuestionPapersBasedonStatus : ");
    let request = req.body;    

    testQuestionPaperServices.fetchTestQuestionPapersBasedonStatus(request, function (test_question_paper_err, test_question_paper_response) {
        if (test_question_paper_err) { 
            res.status(test_question_paper_err).json(test_question_paper_response);
        } else {
            console.log("Test Papers Fetched Successfully"); 
            res.json(test_question_paper_response);
        }
    });
};
exports.addTestQuestionPaper = (req, res, next) => {
    console.log("addTestQuestionPaper : ");
    let request = req.body;    

    testQuestionPaperServices.addTestQuestionPaper(request, function (test_question_paper_err, test_question_paper_response) {
        if (test_question_paper_err) { 
            res.status(test_question_paper_err).json(test_question_paper_response);
        } else {
            console.log("Test Paper Added Successfully"); 
            res.json(test_question_paper_response);
        }
    });
};

exports.validateQuestionPaperName = (req, res, next) => {
    console.log("validateQuestionPaperName : ");
    let request = req.body;    

    testQuestionPaperServices.validateQuestionPaperName(request, function (test_question_paper_err, test_question_paper_response) {
        if (test_question_paper_err) { 
            res.status(test_question_paper_err).json(test_question_paper_response);
        } else {
            console.log("Test Paper Name Validated Successfully"); 
            res.json(test_question_paper_response);
        }
    });
};

exports.viewTestQuestionPaper = (req, res, next) => {
    console.log("viewTestQuestionPaper : ");
    let request = req.body;    

    testQuestionPaperServices.viewTestQuestionPaper(request, function (view_test_question_paper_err, view_test_question_paper_response) {
        if (view_test_question_paper_err) { 
            res.status(view_test_question_paper_err).json(view_test_question_paper_response);
        } else {
            console.log("Fetched Questions Successfully"); 
            res.json(view_test_question_paper_response);
        }
    });
};

exports.toggleQuestionPaper = (req, res, next) => {
    console.log("toggleQuestionPaper : ");
    let request = req.body;    
    testQuestionPaperServices.toggleQuestionPaperBasedOnId(request, function (toggle_question_paper_err, toggle_question_paper_response) {
        if (toggle_question_paper_err) { 
            res.status(400).json(constants.messages.CANNOT_DELETE_QUESTION_PAPER);
        } else {
            res.sendStatus(toggle_question_paper_response);
        }
    });
};