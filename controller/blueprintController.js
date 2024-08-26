const blueprintServices = require("../services/blueprintServices");

exports.fetchBlueprintById = (req, res, next) => {
    let request = req.body;    
    blueprintServices.getBlueprintByItsId(request, function (fetch_blueprint_err, fetch_blueprint_response) {
        if (fetch_blueprint_err) {
            res.status(fetch_blueprint_err).json(fetch_blueprint_response);
        } else {
            console.log("Got Blueprint");
            res.json(fetch_blueprint_response);
        }
    });
};

exports.fetchQuestionBasedOnBlueprint = async (req, res, next) => {
    let request = req.body;
    console.log("NO TOPIC HAS BEEN CHOOSEN!");
    blueprintServices.fetchBlueprintQuestions(request, function (blueQuestions_err, blueQuestions_response) {
        if (blueQuestions_err) {
            res.status(blueQuestions_err).json(blueQuestions_response);
        } else {
            console.log("Got Blueprint Questions!");
            res.json(blueQuestions_response);
        }
    });
};

exports.fetchAllBluePrints = (req, res, next) => {
    console.log("fetchAllBluePrints : ");
    let request = req.body;    
    request.data.blueprint_status = 'Active'; 

    blueprintServices.getAllBluePrints(request, function (blue_prints_err, blue_prints_response) {
        if (blue_prints_err) { 
            res.status(blue_prints_err).json(blue_prints_response);
        } else {
            console.log("Blue Prints Fetched Successfully"); 
            res.json(blue_prints_response);
        }
    });
};

exports.addBluePrint = (req, res, next) => {
    console.log("addBluePrint : ");
    let request = req.body;    

    blueprintServices.addNewBluePrint(request, function (blue_prints_err, blue_prints_response) {
        if (blue_prints_err) { 
            res.status(blue_prints_err).json(blue_prints_response);
        } else {
            console.log("Blue Print Added Successfully"); 
            res.json(blue_prints_response);
        }
    });
};

