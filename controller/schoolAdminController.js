const schoolAdminServices = require("../services/schoolAdminServices");

exports.createSchoolAdmin = (req, res, next) => {
    let request = req.body;
    schoolAdminServices.addSchoolAdmin(request, function (add_school_admin_err, add_school_admin_response) {
        if (add_school_admin_err) {
            res.status(add_school_admin_err).json(add_school_admin_response);
        } else {
            console.log("School Admin created!");
            res.json(add_school_admin_response);
        }
    });
};

exports.updateSchoolAdmin = (req, res, next) => {
    let request = req.body;
    schoolAdminServices.editSchoolAdmin(request, function (edit_school_admin_err, edit_school_admin_response) {
        if (edit_school_admin_err) {
            res.status(edit_school_admin_err).json(edit_school_admin_response);
        } else {
            console.log("School admin updated!");
            res.json(edit_school_admin_response);
        }
    });
};

exports.toggleSchoolAdminStatus = (req, res, next) => {
    let request = req.body;
    schoolAdminServices.changeSchoolAdminStatus(request, function (toggle_school_admin_err, toggle_school_admin_response) {
        if (toggle_school_admin_err) {
            res.status(toggle_school_admin_err).json(toggle_school_admin_response);
        } else {
            console.log("School admin status Changed!");
            res.json(toggle_school_admin_response);
        }
    });
};