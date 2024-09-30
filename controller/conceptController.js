const conceptServices = require("../services/conceptServices");


exports.fetchConceptsBasedonTopics = (req, res, next) => {
    console.log("fetchConceptsBasedonTopics : ");
    let request = req.body;    

    conceptServices.getConceptsBasedonTopics(request, function (blue_prints_err, blue_prints_response) {
        if (blue_prints_err) { 
            res.status(blue_prints_err).json(blue_prints_response);
        } else {
            console.log("Blue Prints Fetched Successfully"); 
            res.json(blue_prints_response);
        }
    });
};
