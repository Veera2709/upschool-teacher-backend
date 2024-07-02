const topicServices = require("../services/topicServices");

exports.topicUnlock = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');
    
    topicServices.topicUnlockService(request, function (unlock_topic_err, unlock_topic_response) {
        if (unlock_topic_err) {
            res.status(unlock_topic_err).json(unlock_topic_response);
        } else {
            console.log("Chapter Lock Status Changed Successfully");
            res.json(unlock_topic_response);
        }
    });
};
exports.fetchDigicardsBasedonTopic = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');
    
    topicServices.getDigicardsBasedonTopic(request, function (individual_topic_err, individual_topic_response) {
        if (individual_topic_err) {
            res.status(individual_topic_err).json(individual_topic_response);
        } else {
            console.log("Topic related Concepts Fetched Successfully");
            res.json(individual_topic_response);
        }
    });
};
exports.fetchTopicsBasedonChapters = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');
    
    topicServices.getTopicsBasedonChapters(request, function (individual_topic_err, individual_topic_response) {
        if (individual_topic_err) {
            res.status(individual_topic_err).json(individual_topic_response);
        } else {
            console.log("Chapter related Topics Fetched Successfully");
            res.json(individual_topic_response);
        }
    });
};
