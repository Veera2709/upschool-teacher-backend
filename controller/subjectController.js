const subjectServices = require("../services/subjectServices");
const constant = require('../constants/constant');

exports.fetchUnitsandChaptersBasedonSubjects = (req, res, next) => {
    console.log("Fetch fetchUnitsandChaptersBasedonSubjects");
    console.log(req.body);
    let request = req.body;
    subjectServices.getUnitsandChaptersBasedonSubjects(request, function (fetch_subjects_err, fetch_subjects_res) {
        if (fetch_subjects_err) {
            res.status(fetch_subjects_err).json(fetch_subjects_res);
        } else {
            console.log("Got Subject Based Unit and Chapter Data!");
            res.json(fetch_subjects_res);
        }
    });
};

exports.fetchTopicAndNoOfQuestions = (req, res, next) => {
    console.log("Fetch topics and no of questions for express");
    console.log(req.body);
    let request = req.body;

    if(request.data.quizSelectionType == constant.unlockChapterValues.expressQuiz)
    {   
        subjectServices.getExpressTopicsAndQuestionCount(request, function (getExpress_err, getExpress_res) {
            if (getExpress_err) {
                res.status(getExpress_err).json(getExpress_res);
            } else {
                console.log("Got topics and no of questions for express!");
                res.json(getExpress_res);
            }
        });
    }
    else if(request.data.quizSelectionType == constant.unlockChapterValues.manualQuiz)
    {
        console.log(constant.unlockChapterValues.manualQuiz);
    }
    else
    {
        console.log(constant.messages.INVALID_DATA);
        res.json([]);
    }
};