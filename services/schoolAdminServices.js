const schoolAdminRepository = require("../repository/schoolAdminRepository");
const userRepository = require("../repository/userRepository");

const constant = require("../constants/constant");

exports.addSchoolAdmin = (request, callback) => {
    schoolAdminRepository.checkDuplicateAdminEmail(request, function (email_exists_error, email_exists_response) {
        if (email_exists_error) {
            console.log(email_exists_error);
            callback(email_exists_error, email_exists_response);
        } else {
            if (email_exists_response.Items.length > 0) {
                callback(400, constant.messages.SCHOOL_USER_EXISTS_ALREADY);
            }
            else {

                // Insert a record for School admin
                schoolAdminRepository.insertSchoolAdmin(request, function (insert_school_admin_err, insert_school_admin_response) {
                    if (insert_school_admin_err) {
                        console.log(insert_school_admin_err);
                        callback(insert_school_admin_err, insert_school_admin_response);
                    } else {
                        callback(insert_school_admin_err, 200);
                    }
                });
            }

        }
    })
}

exports.editSchoolAdmin = (request, callback) => {
    schoolAdminRepository.checkDuplicateAdminEmail(request, function (check_email_error, check_email_response) {
        if (check_email_error) {
            console.log(check_email_error);
            callback(check_email_error, check_email_response);
        } else {
            if (check_email_response.Items.length > 0 && (check_email_response.Items[0].teacher_id !== request.data.school_admin_id)) {
                // console.log("Data already exist with the specified quiz name ");
                callback(400, constant.messages.SCHOOL_USER_EXISTS_ALREADY);
            }
            else {
                schoolAdminRepository.updateSchoolAdmin(request, function (update_school_admin_err, update_school_admin_response) {
                    if (update_school_admin_err) {
                        console.log(update_school_admin_err);
                        callback(update_school_admin_err, update_school_admin_response);
                    } else {
                        callback(update_school_admin_err, 200);
                    }
                });
            }

        }
    })
}

exports.changeSchoolAdminStatus = async function (request, callback) {
    if(request.data.user_status === `Active` || request.data.user_status === `Archived`){
		userRepository.fetchUserDataByUserId(request, function (user_data_err, user_data_response) {
            if (user_data_err) {
                console.log(user_data_err);
                callback(user_data_err, user_data_response);
            } else {
                if (user_data_response.Items.length > 0) {
                    if(user_data_response.Items[0].user_role === 'MasterAdmin' && user_data_response.Items[0].teacher_id !== request.data.school_admin_id)
                    {
                        userRepository.changeUserStatus(request, function (toggle_user_err, toggle_user_response) {
							if (toggle_user_err) {
								console.log(toggle_user_err);
								callback(toggle_user_err, toggle_user_response);
							} else {
								callback(0, toggle_user_response);
							}
						});
                    }
                    else
                    {
                        callback(400, constant.messages.ACCESS_DENIED);
                    }
                } else {
                    callback(400, constant.messages.USER_DOESNOT_EXISTS);
                }
            }
        })
	}else{
		callback(400, constant.messages.INVALID_USER_STATUS)
	}
}
