const dynamoDbCon = require('../awsConfig');
const {userRepository , schoolRepository} = require("../repository")
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { nextTick } = require("process");
const { futimesSync } = require('fs');

exports.userLogin = function (request, callback) {

    /** FETCH USER BY EMAIL **/
    userRepository.fetchUserDataByEmail(request, function (user_data_by_email_err, user_data_by_email_response) {
        if (user_data_by_email_err) {
            console.log(user_data_by_email_err);
            callback(user_data_by_email_err, user_data_by_email_response);
        } else {
            console.log(user_data_by_email_response);
            console.log("user_data_by_email_response.Items[0] : ", user_data_by_email_response.Items[0]);

            if (user_data_by_email_response.Items.length > 0) {
                if (user_data_by_email_response.Items[0].user_status === "Active") {
                    /** CHECK SCHOOL STATUS **/
                    request.data.school_id = user_data_by_email_response.Items[0].school_id;
                    schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
                        if (schoolDataErr) {
                            console.log(schoolDataErr);
                            callback(schoolDataErr, schoolDataRes);
                        }
                        else {
                            if (schoolDataRes.Items.length > 0 && schoolDataRes.Items[0].school_status == "Active" && schoolDataRes.Items[0].subscription_active == "Yes") {
                                if (user_data_by_email_response.Items[0].user_pwd && user_data_by_email_response.Items[0].user_pwd != "") {
                                    let hashReq = {
                                        "salt": user_data_by_email_response.Items[0].user_salt,
                                        "password": request.data.user_password
                                    }

                                    console.log("HASH REQ : ", hashReq);
                                    console.log("user_data_by_email_response.Items[0].user_salt : ", user_data_by_email_response.Items[0].user_salt);
                                    console.log("request.data.user_password : ", request.data.user_password);

                                    console.log("user_data_by_email_response.Items[0].user_pwd : ", user_data_by_email_response.Items[0].user_pwd);
                                    console.log("helper.hashingPassword(hashReq) : ", helper.hashingPassword(hashReq));
                                    console.log("helper.hashingPassword(hashReq) : ", helper.hashingPassword(hashReq));


                                    if (user_data_by_email_response.Items[0].user_pwd === helper.hashingPassword(hashReq)) {
                                        console.log("Password Validated Successfully");
                                        let jwtToken = helper.getJwtToken(user_data_by_email_response.Items[0]);

                                        request["user_jwt"] = jwtToken;
                                        request["teacher_id"] = user_data_by_email_response.Items[0].teacher_id;

                                        console.log("request", request)

                                        userRepository.updateJwtToken(request, function (update_jwt_err, update_jwt_response) {
                                            if (update_jwt_err) {
                                                console.log(update_jwt_err);
                                                callback(update_jwt_err, update_jwt_response);
                                            } else {
                                                console.log("Jwt Token Updated Successfully");
                                                callback(0, [{ jwt: jwtToken, teacher_id: user_data_by_email_response.Items[0].teacher_id, school_id: user_data_by_email_response.Items[0].school_id, school_name: schoolDataRes.Items[0].school_name }]);
                                            }
                                        })
                                    } else {
                                        console.log("Invalid Password");
                                        callback(400, constant.messages.INVALID_PASSWORD);
                                    }
                                }
                                else {
                                    console.log("First Login");
                                    callback(400, constant.messages.FIRST_LOGIN);
                                }
                            }
                            else {
                                console.log(constant.messages.SCHOOL_IS_INACTIVE);
                                callback(400, constant.messages.SCHOOL_IS_INACTIVE);
                            }
                        }
                    })
                    /** END CHECK SCHOOL STATUS **/
                }
                else {
                    console.log(constant.messages.USER_DOESNOT_EXISTS);
                    callback(400, constant.messages.USER_DOESNOT_EXISTS);
                }
            } else {
                console.log("User Email Doesn't Exists");

                /** FETCH USER BY PHONE NO **/
                userRepository.fetchUserDataByPhoneNo(request, function (user_data_by_phNo_err, user_data_by_phNo_response) {
                    if (user_data_by_phNo_err) {
                        console.log(user_data_by_phNo_err);
                        callback(user_data_by_phNo_err, user_data_by_phNo_response);
                    } else {
                        if (user_data_by_phNo_response.Items.length > 0) {
                            if (user_data_by_phNo_response.Items[0].user_status === "Active") {
                                /** CHECK SCHOOL STATUS **/
                                request.data.school_id = user_data_by_phNo_response.Items[0].school_id;
                                schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
                                    if (schoolDataErr) {
                                        console.log(schoolDataErr);
                                        callback(schoolDataErr, schoolDataRes);
                                    }
                                    else {
                                        if (schoolDataRes.Items.length > 0 && schoolDataRes.Items[0].school_status == "Active" && schoolDataRes.Items[0].subscription_active == "Yes") {
                                            if (user_data_by_phNo_response.Items[0].user_pwd && user_data_by_phNo_response.Items[0].user_pwd != "") {
                                                let hashReq = {
                                                    "salt": user_data_by_phNo_response.Items[0].user_salt,
                                                    "password": request.data.user_password
                                                }

                                                if (user_data_by_phNo_response.Items[0].user_pwd === helper.hashingPassword(hashReq)) {
                                                    console.log("Password Validated Successfully");
                                                    let jwtToken = helper.getJwtToken(user_data_by_phNo_response.Items[0]);

                                                    request["user_jwt"] = jwtToken;
                                                    request["teacher_id"] = user_data_by_phNo_response.Items[0].teacher_id;

                                                    console.log("request", request)

                                                    userRepository.updateJwtToken(request, function (update_jwt_err, update_jwt_response) {
                                                        if (update_jwt_err) {
                                                            console.log(update_jwt_err);
                                                            callback(update_jwt_err, update_jwt_response);
                                                        } else {
                                                            console.log("Jwt Token Updated Successfully");
                                                            callback(0, [{ jwt: jwtToken, teacher_id: user_data_by_phNo_response.Items[0].teacher_id, school_id: user_data_by_phNo_response.Items[0].school_id, school_name: schoolDataRes.Items[0].school_name }]);
                                                        }
                                                    })
                                                } else {
                                                    console.log("Invalid Password");
                                                    callback(400, constant.messages.INVALID_PASSWORD);
                                                }
                                            }
                                            else {
                                                console.log("First Login");
                                                callback(400, constant.messages.FIRST_LOGIN);
                                            }
                                        }
                                        else {
                                            console.log(constant.messages.SCHOOL_IS_INACTIVE);
                                            callback(400, constant.messages.SCHOOL_IS_INACTIVE);
                                        }
                                    }
                                })
                                /** END CHECK SCHOOL STATUS **/
                            }
                            else {
                                console.log(constant.messages.USER_DOESNOT_EXISTS);
                                callback(400, constant.messages.USER_DOESNOT_EXISTS);
                            }

                        } else {
                            console.log("User Phone Number Doesn't Exists");

                            /** FETCH USER BY USER NAME **/
                            userRepository.fetchUserDataByUserName(request, function (user_data_by_name_err, user_data_by_name_response) {
                                if (user_data_by_name_err) {
                                    console.log(user_data_by_name_err);
                                    callback(user_data_by_name_err, user_data_by_name_response);
                                } else {
                                    if (user_data_by_name_response.Items.length > 0) {
                                        if (user_data_by_name_response.Items[0].user_status === "Active") {
                                            /** CHECK SCHOOL STATUS **/
                                            request.data.school_id = user_data_by_name_response.Items[0].school_id;
                                            schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
                                                if (schoolDataErr) {
                                                    console.log(schoolDataErr);
                                                    callback(schoolDataErr, schoolDataRes);
                                                }
                                                else {
                                                    if (schoolDataRes.Items.length > 0 && schoolDataRes.Items[0].school_status == "Active" && schoolDataRes.Items[0].subscription_active == "Yes") {
                                                        if (user_data_by_name_response.Items[0].user_pwd && user_data_by_name_response.Items[0].user_pwd != "") {
                                                            let hashReq = {
                                                                "salt": user_data_by_name_response.Items[0].user_salt,
                                                                "password": request.data.user_password
                                                            }

                                                            if (user_data_by_name_response.Items[0].user_pwd === helper.hashingPassword(hashReq)) {
                                                                console.log("Password Validated Successfully");
                                                                let jwtToken = helper.getJwtToken(user_data_by_name_response.Items[0]);

                                                                request["user_jwt"] = jwtToken;
                                                                request["teacher_id"] = user_data_by_name_response.Items[0].teacher_id;

                                                                console.log("request", request)

                                                                userRepository.updateJwtToken(request, function (update_jwt_err, update_jwt_response) {
                                                                    if (update_jwt_err) {
                                                                        console.log(update_jwt_err);
                                                                        callback(update_jwt_err, update_jwt_response);
                                                                    } else {
                                                                        console.log("Jwt Token Updated Successfully");
                                                                        callback(0, [{ jwt: jwtToken, teacher_id: user_data_by_name_response.Items[0].teacher_id, school_id: user_data_by_name_response.Items[0].school_id, school_name: schoolDataRes.Items[0].school_name }]);
                                                                    }
                                                                })
                                                            } else {
                                                                console.log("Invalid Password");
                                                                callback(400, constant.messages.INVALID_PASSWORD);
                                                            }
                                                        }
                                                        else {
                                                            console.log("First Login");
                                                            callback(400, constant.messages.FIRST_LOGIN);
                                                        }
                                                    }
                                                    else {
                                                        console.log(constant.messages.SCHOOL_IS_INACTIVE);
                                                        callback(400, constant.messages.SCHOOL_IS_INACTIVE);
                                                    }
                                                }
                                            })
                                            /** END CHECK SCHOOL STATUS **/
                                        }
                                        else {
                                            console.log(constant.messages.USER_DOESNOT_EXISTS);
                                            callback(400, constant.messages.USER_DOESNOT_EXISTS);
                                        }
                                    } else {
                                        console.log("User Name Doesn't Exists");
                                        callback(400, constant.messages.TEACHER_DOESNOT_EXISTS);
                                    }
                                }
                            });
                            /** FETCH USER BY USER NAME **/
                        }
                    }
                });
                /** FETCH USER BY PHONE NO **/
            }
        }
    });
    /** END FETCH USER BY EMAIL **/
}

exports.userLogout = function (request, callback) {

    let decode_token = helper.decodeJwtToken(request.token);
    console.log("request - : ", request);

    request["user_jwt"] = "";
    request["teacher_id"] = decode_token.teacher_id;

    userRepository.updateJwtToken(request, function (update_jwt_err, update_jwt_response) {
        if (update_jwt_err) {
            console.log(update_jwt_err);
            callback(update_jwt_err, update_jwt_response);
        } else {
            console.log("OTP send for login without password");
            callback(0, 200);
        }
    })
}

exports.LoginWithoutPassword = function (request, callback) {
    console.log("LoginWithoutPassword : ", request);
    userRepository.fetchUserDataByEmail(request, function (fetch_user_data_err, fetch_user_data_response) {
        if (fetch_user_data_err) {
            console.log(fetch_user_data_err);
            callback(fetch_user_data_err, fetch_user_data_response);
        } else {
            if (fetch_user_data_response.Items.length > 0 && fetch_user_data_response.Items[0].user_status == "Active") {

                /** CHECK SCHOOL STATUS **/
                request.data.school_id = fetch_user_data_response.Items[0].school_id;
                schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
                    if (schoolDataErr) {
                        console.log(schoolDataErr);
                        callback(schoolDataErr, schoolDataRes);
                    }
                    else {
                        if (schoolDataRes.Items.length > 0 && schoolDataRes.Items[0].school_status == "Active" && schoolDataRes.Items[0].subscription_active == "Yes") {
                            let user_otp = helper.getRandomOtp().toString();

                            var mailPayload = {
                                "user_otp": user_otp,
                                "toMail": request.data.user_email,
                                "subject": (request.data.otpSubject && request.data.otpSubject === "reset") ? constant.mailSubject.otpForResettingPassword : (request.data.otpSubject && request?.data?.otpSubject === "create") ? constant.mailSubject.otpForCreatingPassword : constant.mailSubject.otpForLogin,
                                "mailFor": "Send OTP",
                            };

                            console.log("MAIL PAYLAOD : ", mailPayload);
                            /** PUBLISH SNS **/
                            let mailParams = {
                                Message: JSON.stringify(mailPayload),
                                TopicArn: process.env.SEND_OTP_ARN
                            };

                            dynamoDbCon.sns.publish(mailParams, function (err, data) {
                                if (err) {
                                    console.log("SNS PUBLISH ERROR");
                                    console.log(err, err.stack);
                                    callback(400, "SNS ERROR");
                                }
                                else {
                                    console.log("SNS PUBLISH SUCCESS");

                                    let teacher_id = fetch_user_data_response.Items[0].teacher_id
                                    request.data["user_otp"] = user_otp;
                                    request.data["teacher_id"] = teacher_id;
                                    userRepository.updateUserOtp(request, function (update_user_otp_err, update_user_otp_response) {
                                        if (update_user_otp_err) {
                                            console.log(update_user_otp_err);
                                            callback(update_user_otp_err, update_user_otp_response);
                                        } else {
                                            callback(update_user_otp_err, update_user_otp_response);
                                        }
                                    })

                                }
                            });
                            /** END PUBLISH SNS **/
                        }
                        else {
                            console.log(constant.messages.SCHOOL_IS_INACTIVE);
                            callback(400, constant.messages.SCHOOL_IS_INACTIVE);
                        }
                    }
                })
                /** END CHECK SCHOOL STATUS **/

            } else {
                callback(400, constant.messages.TEACHER_DOESNOT_EXISTS);
            }
        }
    });
}

exports.validateOtpForLogin = function (request, callback) {
    console.log("validateOtpForLogin : ", request);

    userRepository.fetchUserDataByEmail(request, function (fetch_user_data_err, fetch_user_data_response) {
        if (fetch_user_data_err) {
            console.log(fetch_user_data_err);
            callback(fetch_user_data_err, fetch_user_data_response);
        } else {
            console.log("fetch_user_data_response", fetch_user_data_response);
            if (fetch_user_data_response.Items.length > 0) {
                if (fetch_user_data_response.Items[0].user_otp === request.data.entered_otp) {

                    request.data.school_id = fetch_user_data_response.Items[0].school_id;
                    schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
                        if (schoolDataErr) {
                            console.log(schoolDataErr);
                            callback(schoolDataErr, schoolDataRes);
                        }
                        else {
                            if (schoolDataRes.Items.length > 0 && schoolDataRes.Items[0].school_status == "Active" && schoolDataRes.Items[0].subscription_active == "Yes") {

                                let user_reset_otp = helper.getRandomOtp().toString();
                                request.data["teacher_id"] = fetch_user_data_response.Items[0].teacher_id
                                request.data["user_reset_otp"] = user_reset_otp;
                                userRepository.resetUserOtp(request, function (reset_user_otp_err, reset_user_otp_response) {
                                    if (reset_user_otp_err) {
                                        console.log(reset_user_otp_err);
                                        callback(reset_user_otp_err, reset_user_otp_response);
                                    } else {
                                        let jwtToken = helper.getJwtToken(fetch_user_data_response.Items[0]);

                                        request["user_jwt"] = jwtToken;
                                        request["teacher_id"] = fetch_user_data_response.Items[0].teacher_id;

                                        let firstLogin = (fetch_user_data_response.Items[0].user_pwd && fetch_user_data_response.Items[0].user_pwd != "") ? "No" : "Yes";

                                        userRepository.updateJwtToken(request, function (update_jwt_err, update_jwt_response) {
                                            if (update_jwt_err) {
                                                console.log(update_jwt_err);
                                                callback(update_jwt_err, update_jwt_response);
                                            } else {
                                                console.log("Jwt Token Updated Successfully");
                                                callback(0, [{ jwt: jwtToken, isFirstTimeLogin: firstLogin, teacher_id: fetch_user_data_response.Items[0].teacher_id, school_id: fetch_user_data_response.Items[0].school_id, school_name: schoolDataRes.Items[0].school_name }]);
                                            }
                                        })
                                    }
                                })

                            }
                            else {
                                console.log(constant.messages.SCHOOL_IS_INACTIVE);
                                callback(400, constant.messages.SCHOOL_IS_INACTIVE);
                            }
                        }
                    })



                } else {
                    callback(400, "Invalid OTP")
                }
            } else {
                callback(400, "User Email does not Exits");
            }
        }
    })
}

exports.passwordCreateOrReset = function (request, callback) {
    userRepository.fetchUserDataByEmail(request, function (fetch_user_data_err, fetch_user_data_response) {
        if (fetch_user_data_err) {
            console.log(fetch_user_data_err);
            callback(fetch_user_data_err, fetch_user_data_response);
        } else {
            if (fetch_user_data_response.Items.length > 0) {
                if (request.data.new_password === request.data.confirm_password) {
                    var user_salt = helper.getRandomString();
                    let hashReq = {
                        "salt": user_salt,
                        "password": request.data.new_password
                    }

                    console.log("helper.hashingPassword(hashReq) : ", helper.hashingPassword(hashReq));
                    console.log("CHANGE HASH REQ : ", hashReq);
                    console.log("user_salt : ", user_salt);

                    let user_pwd = helper.hashingPassword(hashReq);
                    request.data["user_salt"] = user_salt;
                    request.data["user_pwd"] = user_pwd;

                    request.data["teacher_id"] = fetch_user_data_response.Items[0].teacher_id;
                    request.data["user_jwt"] = "";

                    userRepository.resetPassword(request, function (reset_forgot_otp_and_pwd_err, reset_forgot_otp_and_pwd_response) {
                        if (reset_forgot_otp_and_pwd_err) {
                            console.log(reset_forgot_otp_and_pwd_err);
                            callback(reset_forgot_otp_and_pwd_err, reset_forgot_otp_and_pwd_response);
                        } else {
                            console.log("PASSWORD RESET!");
                            callback(0, 200);
                        }
                    })
                }
                else {
                    callback(403, constant.messages.PASSWORD_MISSMATCH);
                }
            } else {
                callback(402, constant.messages.USER_EMAIL_DOESNOT_EXISTS);
            }
        }
    })
}

exports.updatePassword = function (request, callback) {
    request["teacher_id"] = request.data.teacher_id;
    userRepository.fetchUserDataByUserId(request, function (teacherData_err, teacherData_response) {
        if (teacherData_err) {
            console.log(teacherData_err);
            callback(teacherData_err, teacherData_response);
        } else {
            if (teacherData_response.Items.length > 0) {
                if (teacherData_response.Items[0].user_pwd && teacherData_response.Items[0].user_pwd != "") {
                    let hashReq = {
                        "salt": teacherData_response.Items[0].user_salt,
                        "password": request.data.oldPassword
                    }
                    let oldHashPassword = helper.hashingPassword(hashReq);

                    if (teacherData_response.Items[0].user_pwd === oldHashPassword) {
                        if (request.data.newPassword === request.data.confirmPassword) {
                            var user_salt = helper.getRandomString();
                            let newHashReq = {
                                "salt": user_salt,
                                "password": request.data.newPassword
                            }

                            let user_pwd = helper.hashingPassword(newHashReq);
                            request.data["user_salt"] = user_salt;
                            request.data["user_pwd"] = user_pwd;

                            request.data["teacher_id"] = teacherData_response.Items[0].teacher_id;
                            request.data["user_jwt"] = teacherData_response.Items[0].user_jwt;

                            userRepository.resetPassword(request, function (changedPassword_err, changedPassword_response) {
                                if (changedPassword_err) {
                                    console.log(changedPassword_err);
                                    callback(changedPassword_err, changedPassword_response);
                                } else {
                                    console.log("PASSWORD CHANGED!");
                                    callback(0, 200);
                                }
                            })
                        }
                        else {
                            console.log(constant.messages.PASSWORD_MISSMATCH);
                            callback(403, constant.messages.PASSWORD_MISSMATCH);
                        }
                    }
                    else {
                        console.log(constant.messages.INCORRECT_OLDPASSWORD);
                        callback(400, constant.messages.INCORRECT_OLDPASSWORD);
                    }
                }
                else {
                    console.log("First Login");
                    callback(400, constant.messages.FIRST_LOGIN);
                }
            } else {
                console.log(constant.messages.USER_DOESNOT_EXISTS);
                callback(402, constant.messages.USER_DOESNOT_EXISTS);
            }
        }
    })
}





// exports.checkQuestionPaperMapping = function (request, callback) {
//     console.log("request", request);
//     classTestData = request.arrayToCheck;
//     finalRes = "";
//     classTestData.forEach((Items, index) => {
//         if (Items.question_paper_id === request.question_paper_id) {
//             finalRes += ", " + Items.class_test_name;
//         }
//     })
//     console.log("finalRes", finalRes);
//     callback(0, finalRes)
// }
