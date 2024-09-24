const {teacherServices} = require("../services");
const constant = require("../constants/constant");
const { formatResponse } = require("../helper/helper");

exports.fetchTeacherClasses = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await teacherServices.getTeacherClasses(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.fetchTeacherSectionsBasedonClass = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await teacherServices.getTeacherSectionsBasedonClass(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.fetchTeacherSubjectsBasedonSection = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await teacherServices.getTeacherSubjectsBasedonSection(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.fetchDigicardsBasedonTopic = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');
    
    teacherServices.getDigicardsBasedonTopic(request, function (individual_topic_err, individual_topic_response) {
        if (individual_topic_err) {
            res.status(individual_topic_err).json(individual_topic_response);
        } else {
            console.log("Topic related Concepts Fetched Successfully");
            res.json(individual_topic_response);
        }
    });
};

exports.archivedActiveTopicsInChapter = (req, res, next) => {
    let request = req.body;    
    teacherServices.archiveAndActivateTopicInChapter(request, function (archiveTopic_err, archiveTopic_response) {
        if (archiveTopic_err) {
            res.status(archiveTopic_err).json(archiveTopic_response);
        } else {
            console.log("Topic Status Changed In Teacher Activity!");
            res.json(archiveTopic_response);
        }
    });
};

exports.getPreGrantedTeacherPermissions = (req, res, next) => {
    let request = req.body;    
    teacherServices.getTeacherPreLearningPermissions(request, function (permission_err, permission_response) {
        if (permission_err) {
            res.status(permission_err).json(permission_response);
        } else {
            console.log("Got granted teacher permission!");
            res.json(permission_response);
        }
    });
};

exports.addDigicardExtension = (req, res, next) => {
    let request = req.body;    
    teacherServices.addteacherDigicardExtension(request, function (digiExtension_err, digiExtension_response) {
        if (digiExtension_err) {
            res.status(digiExtension_err).json(digiExtension_response);
        } else {
            console.log("Digicatd extension added!");
            res.json(digiExtension_response);
        }
    });
};

exports.generatePrePostQuiz = (req, res, next) => {
    let request = req.body;    
    
    if(request.data.learningType === constant.prePostConstans.preLearningVal)
    {
        teacherServices.generateQuizForPreLearning(request, function (preGenrQuiz_err, preGenrQuiz_response) {
            if (preGenrQuiz_err) {
                res.status(preGenrQuiz_err).json(preGenrQuiz_response);
            } else {
                console.log("Pre Quiz Generated!");
                res.json(preGenrQuiz_response);
            }
        });
    }
    else if(request.data.learningType === constant.prePostConstans.postLearningVal)
    {
        teacherServices.generateQuizForPostLearning(request, function (postGenrQuiz_err, postGenrQuiz_response) {
            if (postGenrQuiz_err) {
                res.status(postGenrQuiz_err).json(postGenrQuiz_response);
            } else {
                console.log("Post Quiz Generated!");
                res.json(postGenrQuiz_response);
            }
        });
    }
    else
    {
        console.log(constant.messages.INVALID_DATA, request.data.learningType);
        res.status(400).json(constant.messages.INVALID_DATA);
    }    
};
exports.getPostGrantedTeacherPermissions = (req, res, next) => {
    console.log("getPostGrantedTeacherPermissions : ");
    let request = req.body;    
    teacherServices.getTeacherPostLearningPermissions(request, function (permission_err, permission_response) {
        if (permission_err) {
            res.status(permission_err).json(permission_response);
        } else {
            console.log("Got granted teacher permission for Post!");
            res.json(permission_response);
        }
    });
};
exports.reArrangeDigiCardOrder = (req, res, next) => {
    console.log("reArrangeDigiCardOrder : ");
    let request = req.body;    
    teacherServices.changeDigiCardOrder(request, function (permission_err, permission_response) {
        if (permission_err) {
            res.status(permission_err).json(permission_response);
        } else {
            console.log("DigiCard Order Changed!");
            res.json(permission_response);
        }
    });
};
exports.toggleDigicardsInTopic = (req, res, next) => {
    console.log("toggleDigicardsInTopic : ");
    let request = req.body;    
    teacherServices.activeAndArchiveDigicardsInTopic(request, function (permission_err, permission_response) {
        if (permission_err) {
            res.status(permission_err).json(permission_response);
        } else {
            console.log("DigiCard Archived/Activated!"); 
            res.json(permission_response);
        }
    });
};
exports.fetchDigiCardstoReorder = (req, res, next) => {
    console.log("fetchDigiCardstoReorder : ");
    let request = req.body;    
    teacherServices.getDigiCardstoReorder(request, function (permission_err, permission_response) {
        if (permission_err) {
            res.status(permission_err).json(permission_response);
        } else {
            console.log("DigiCards Fetched Successfully"); 
            res.json(permission_response);
        }
    });
};
exports.fetchQuestionSourceandChapters = (req, res, next) => {
    console.log("fetchQuestionSourceandChapters : ");
    let request = req.body;    
    request.data.source_type = constant.contentType.question;
    request.data.source_status = "Active"; 

    teacherServices.getQuestionSourceandChapters(request, function (question_source_and_chapters_err, question_source_and_chapters_response) {
        if (question_source_and_chapters_err) { 
            res.status(question_source_and_chapters_err).json(question_source_and_chapters_response);
        } else {
            console.log("QuestionSource and Chapters Fetched Successfully"); 
            res.json(question_source_and_chapters_response);
        }
    });
};
