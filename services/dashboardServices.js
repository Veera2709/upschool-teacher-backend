const dashboardRepository = require("../repository/dashboardRepository");
const constant = require("../constants/constant");
const schoolRepository = require("../repository/schoolRepository");
const studentRepository = require("../repository/studentRepository");
const subjectRepository = require("../repository/subjectRepository");
const teacherRepository = require("../repository/teacherRepository");
const unitRepository = require("../repository/unitRepository");
const quizRepository = require("../repository/quizRepository");
const quizResultRepository = require("../repository/quizResultRepository");
const chapterRepository = require("../repository/chapterRepository");
const topicRepository = require("../repository/topicRepository");
const userRepository = require("../repository/userRepository");

exports.getAssessmentDetails = (request, callback) => {
  // get the class % to generate reports using school_id
  // get total num of students in that class using class_id
  // track down necessary tables till you get ALL the topics(pre/post) that are there in that subject using subject_id
  // sub -> units -> chap -> topics -> concepts -> groups -> questions
  // fetch all the ACTIVE quiz (pre/post) of that subject with the chosen topic IDs
  // All topics - selected topics in each quiz = skipped topics (applicable only for Post Quiz)
  // then for each quiz refer to the quiz result table, get the count of answer sheets uploaded
  // calculate the % of answer sheets uploaded for each quiz
  // compare this result with the % you fetched from school table
  // if this % is more than configured %, then the topic is completed, else it is remaining

  try{
  schoolRepository.getSchoolDetailsById(
    request,
    (schoolDataErr, schoolDataRes) => {
      if (schoolDataErr) {
        console.log(schoolDataErr);
        callback(schoolDataErr, schoolDataRes);
      } else {
        console.log("----------------coming-------------------");

        const classPercentagePre =
          schoolDataRes.Items[0].pre_quiz_config.class_percentage_for_report;
        const classPercentagePost =
          schoolDataRes.Items[0].post_quiz_config.class_percentage_for_report;

        studentRepository.getStudentsData(
          request,
          function (
            fetch_teacher_section_students_err,
            fetch_teacher_section_students_response
          ) {
            if (fetch_teacher_section_students_err) {
              console.log("----------------coming2-------------------");
              console.log(fetch_teacher_section_students_err);
              callback(
                fetch_teacher_section_students_err,
                fetch_teacher_section_students_response
              );
            } else {

              const studentsCount = fetch_teacher_section_students_response.Items.length;

              subjectRepository.getSubjetById(
                request,
                function (subject_err, subject_res) {
                  if (subject_err) {
                    console.log(subject_err);
                    console.log("----------------getSubjetById-------------------");

                    callback(subject_err, subject_res);
                  } else {
                    if (subject_res.Items.length > 0) {
                      let subject_unit_id =
                        subject_res.Items[0].subject_unit_id;

                      unitRepository.fetchUnitData(
                        { subject_unit_id: subject_unit_id },
                        async function (unit_err, unit_res) {
                          if (unit_err) {
                            console.log(unit_err);
                            console.log("----------------fetchUnitData-------------------");

                            callback(unit_err, unit_res);
                          } else {
                            if (unit_res.Items.length > 0) {
                              let unit_chapter_id = [];

                              await unit_res.Items.forEach((e) =>
                                unit_chapter_id.push(...e.unit_chapter_id)
                              );

                              chapterRepository.fetchBulkChaptersIDName(
                                { unit_chapter_id: unit_chapter_id },
                                function (chapter_err, chapter_res) {
                                  if (chapter_err) {

                                    console.log("----------------fetchBulkChaptersIDName-------------------");
                                    console.log(chapter_err);
                                    callback(chapter_err, chapter_res);
                                  } else {
                                    let preLearningTopicsCount = 0;
                                    let postLearningTopicsCount = 0;
                                    let preLearningCompletedTopicsCount = 0;
                                    let postLearningCompletedTopicsCount = 0;
                                    chapter_res.Items.map(ele=>
                                    {
                                      preLearningTopicsCount += ele.prelearning_topic_id.length;
                                      postLearningTopicsCount += ele.postlearning_topic_id.length;
                                    })

                                    console.log(preLearningTopicsCount);
                                    console.log(postLearningTopicsCount);
                                    quizRepository.fetchAllQuizBasedonSubject(
                                      request,
                                      async (quizDataErr, quizDataRes) => {
                                        if (quizDataErr) {
                                          console.log(quizDataErr);
                                          callback(quizDataErr, quizDataRes);
                                        } else {

                                          // console.log("--------------",quizDataRes);
                                          const quizIds = [];
                                          await Promise.all(
                                          quizDataRes.Items.map((val)=>
                                          // [{quiz_id : "cc50fb3a-f992-57d8-85dc-c159e02194c5"} ,{ quiz_id :"615584c2-0864-5f03-9397-62d5e148a6bc"}].map((val)=>
                                          {
                                            
                                            return new Promise((resolve, reject) => {

                                              quizResultRepository.fetchQuizResultByQuizId( { data: { quiz_id: val.quiz_id } }, async (quizResultDataErr, quizResultDataRes) => {
                                                if (quizResultDataErr) {
                                                  console.log(quizResultDataErr);
                                                  return reject(quizResultDataErr);
                                                } else {

                                                  let studentsAttendedQuiz = quizResultDataRes.Items.length
                                                  if(val.learningType == "preLearning")
                                                  {
                                                    if(studentsAttendedQuiz >= (classPercentagePre * studentsCount * 0.01))
                                                    {
                                                      preLearningCompletedTopicsCount += val.selectedTopics.length
                                                    }
                                                  }
                                                  else{
                                                    if(studentsAttendedQuiz >= (classPercentagePost * studentsCount * 0.01))
                                                    {
                                                      postLearningCompletedTopicsCount += val.selectedTopics.length
                                                    }
                                                  }
                                              console.log( "--- - -",quizResultDataRes.Items.length); 
                                              resolve();                             
                                                }
                                              })
                                            })
                                          }))
                                          console.log("quizIds - ",quizIds);
                                        }}
                                    )
                                    callback(200,{
                                      preLearningTopics: {
                                        content: ((preLearningCompletedTopicsCount / preLearningTopicsCount) * 100).toFixed(1) + "%",
                                        totalTopics: preLearningTopicsCount,
                                        completedTopics: preLearningCompletedTopicsCount,
                                        // skippedTopics: 5,
                                        remainingTopics: preLearningTopicsCount - preLearningCompletedTopicsCount,
                                      },
                                      postLearningTopics: {
                                        content: ((postLearningCompletedTopicsCount / postLearningTopicsCount) * 100).toFixed(1) + "%",
                                        totalTopics: postLearningTopicsCount,
                                        completedTopics: postLearningCompletedTopicsCount,
                                        // skippedTopics: 5,
                                        remainingTopics: postLearningTopicsCount - postLearningCompletedTopicsCount ,
                                      },
                                      WorksheetsGenerated: {
                                        content: 28,
                                      },
                                      QuestionPapersGenerated: {
                                        content: 13,
                                      },
                                    });
                                    // callback(200,{preLearningTopicsCount ,postLearningTopicsCount ,preLearningCompletedTopicsCount ,postLearningCompletedTopicsCount});
                                  }
                                }
                              );
                            } else {
                              // response.chapters = unit_res.Items;
                              callback(200, unit_res.Items);
                            }
                          }
                        }
                      );
                    } else {
                      // response.chapters = subject_res.Items;
                      callback(200, subject_res.Items);
                    }
                  }
                }
              );
            }
          }
        );
      }
    }
  );
  
   } catch (error) {
  console.error(error);
  callback(error);
}
};

// const request2 = { data :{
//     //  client_class_id : "1df5eb4b-1186-57a1-8984-f36fcfbfcb8b",
//     //  section_id : "f0d3d2ea-e1b6-5a1d-829d-83aefbe7a065",
//     //  subject_id : "331c1f7f-b3fd-5ae3-b361-11cf90ba3675",
//     //  quiz_status : "Active"
//     client_class_id : "1807a694-3b96-5e78-848a-8a2b69bce740",
//     section_id : "49c0fdef-6959-5103-9d0f-6a53caa48e4a",
//     subject_id : "331c1f7f-b3fd-5ae3-b361-11cf90ba3675",
//     quiz_status : "Active"
// }
// }
exports.getTargetedLearningExpectation = async (request, callback) => {
  let classStrength = 0;
  let totalTopics = 0;
  let reachedTopics = 0;

  console.log(request);
 await schoolRepository.getSchoolDetailsById(
    request,
    (schoolDataErr, schoolDataRes) => {
      if (schoolDataErr) {
        console.log(schoolDataErr); 
        callback(schoolDataErr, schoolDataRes);
      } else {       
        console.log("-----------schoolDataRes------------------  ",schoolDataRes.Items[0].teacher_access);
        const classPercentagePre =
          schoolDataRes.Items[0].pre_quiz_config.class_percentage;
        const classPercentagePost =
          schoolDataRes.Items[0].post_quiz_config.class_percentage;
  
   studentRepository.getStudentsData(
    request,
    (studentDataErr, studentDataRes) => {
      if (studentDataErr) {
        console.log(studentDataErr);
        callback(studentDataErr, studentDataRes);
      } else {
        classStrength = studentDataRes?.Items?.length;
        console.log("--StudentsData------", studentDataRes.Items.length);

        quizRepository.fetchAllQuizBasedonSubject(
          request,
          async (quizDataErr, quizDataRes) => {
            if (quizDataErr) {
              console.log(quizDataErr);
              callback(quizDataErr, quizDataRes);
            } else {
              quizDataRes.Items.map((val) => {
                let passedStudentsOfParticularQuiz = 0;
                totalTopics += val.selectedTopics.length;

                console.log("val.quiz_id  -  ", val.quiz_id);
                quizResultRepository.fetchQuizResultByQuizId(
                  { data: { quiz_id: val.quiz_id } },
                  (quizResultDataErr, quizResultDataRes) => {
                    if (quizResultDataErr) {
                      console.log(quizResultDataErr);
                      callback(quizResultDataErr, quizResultDataRes);
                    } else {
                      console.log(
                        "=================quizResultDataRes========================================================="
                      );
                      console.log(
                        "total students atended quiz --",
                        quizResultDataRes.Items.length
                      );
                      quizResultDataRes.Items.map((val) => {
                        // if(val.isPassed)
                        if (true) {
                          passedStudentsOfParticularQuiz++;
                        }
                      });
                    }
                  }
                );
                console.log(
                  "passedStudentsOfParticularQuiz --", passedStudentsOfParticularQuiz," classStrength -- ", classStrength
                );
                if(val.learningType == "preLearning" && schoolDataRes.Items[0].teacher_access.prequiz_targetlearning == 'Yes')
                {
                  // console.log("----classPercentagePre--------",passedStudentsOfParticularQuiz >= classStrength * classPercentagePre * 0.01);
                  if (passedStudentsOfParticularQuiz >= (classPercentagePre ? classStrength * classPercentagePre * 0.01  : 0)) {
                    console.log("coming");
                    reachedTopics += val.selectedTopics.length;
                  }
                }
                else if (passedStudentsOfParticularQuiz >= (classPercentagePost ? classStrength * classPercentagePost * 0.01  : 0)) {
                  console.log("------classPercentagePost------",classPercentagePost);
                  reachedTopics += val.selectedTopics.length;
                }
              });
              console.log("---totalTopics------", totalTopics , " reachedTopics  - ",reachedTopics ,"");

              callback(0, { totalTopics, reached: reachedTopics , classPercentagePre ,  classPercentagePost});
            }
          }
        );
        // callback(500 ,"Insufficient Data");
      }
    }
  );
}
}
)
};

exports.getTargetedLearningExpectationDetails = async (request, callback) => {
  // const request2 = { data :{

  //          client_class_id : "1df5eb4b-1186-57a1-8984-f36fcfbfcb8b",
  //          section_id : "f0d3d2ea-e1b6-5a1d-829d-83aefbe7a065",
  //          subject_id : "331c1f7f-b3fd-5ae3-b361-11cf90ba3675",
  //          quiz_status : "Active"
  //         }
  //     };
  //     const request3 = { data :{
  //     client_class_id : "1807a694-3b96-5e78-848a-8a2b69bce740",
  //         section_id : "49c0fdef-6959-5103-9d0f-6a53caa48e4a",
  //         subject_id : "331c1f7f-b3fd-5ae3-b361-11cf90ba3675",
  //         quiz_status : "Active"
  //     }};


 await schoolRepository.getSchoolDetailsById(
    request,
    (schoolDataErr, schoolDataRes) => {
      if (schoolDataErr) {
        console.log(schoolDataErr);
        callback(schoolDataErr, schoolDataRes);
      } else {
        const classPercentagePre =
          schoolDataRes.Items[0].pre_quiz_config.class_percentage;
        const classPercentagePost =
          schoolDataRes.Items[0].post_quiz_config.class_percentage;
   
   studentRepository.getStudentsData(
    request,
    (studentDataErr, studentDataRes) => {
      if (studentDataErr) {
        console.log(studentDataErr);
        callback(studentDataErr, studentDataRes);
      } else {
        const classStrength = studentDataRes?.Items?.length;
        console.log("--StudentsData------", studentDataRes.Items.length);

        quizRepository.fetchAllQuizBasedonSubject(
          request,
          async (quizDataErr, quizDataRes) => {
            if (quizDataErr) {
              console.log(quizDataErr);
              callback(quizDataErr, quizDataRes);
            } else {
              const groupByChapterId = (data) => {
                // Sort the data by chapter_id
                data.sort((a, b) => {
                  if (a.chapter_id < b.chapter_id) return -1;
                  if (a.chapter_id > b.chapter_id) return 1;
                  return 0;
                });

                const groupedData = data.reduce((acc, item) => {
                  const chapterId = item.chapter_id;
                  const chapterName = "item.chapter_name"; // Assuming each item has a chapter_name field
                  const chapterIndex = acc.findIndex(
                    (chapter) => chapter.id === chapterId
                  );

                  const quizData = {
                    selectedTopics: item.selectedTopics,
                    quiz_id: item.quiz_id,
                    passedStudentsOfParticularQuiz:
                      item.passedStudentsOfParticularQuiz,
                    failedStudentsOfParticularQuiz:
                      item.failedStudentsOfParticularQuiz,
                    learningType: item.learningType,
                    date: item.quizStartDate.dd_mm_yyyy,
                  };

                  if (chapterIndex === -1) {
                    // Chapter doesn't exist, create new chapter
                    acc.push({
                      id: chapterId,
                      chapterName: chapterName,
                      classPercentagePost,
                      classPercentagePre,
                      totalStrength: classStrength,
                      data: [quizData],
                    });
                  } else {
                    // Chapter exists, push to its data array
                    acc[chapterIndex].data.push(quizData);
                  }

                  return acc;
                }, []);

                // here data contains quizes sorted on chapter id
                console.log(
                  "---------------------groupedData----------------------------"
                );
                console.log(groupedData);
                console.log("----------------");

                const processQuizResults = async () => {
                  // Iterate over the array of chapters
                  await Promise.all(
                    groupedData.map(async (chapter) => {
                      await Promise.all(
                        chapter.data.map(async (val, i) => {
                          // quizes of same chapter
                          console.log(
                            "-----groupedData[chapterId].length--------",
                            val.quiz_id
                          );

                          return new Promise((resolve, reject) => {
                            quizResultRepository.fetchQuizResultByQuizId(
                              { data: { quiz_id: val.quiz_id } },
                              async (quizResultDataErr, quizResultDataRes) =>
                               {
                                if (quizResultDataErr) {
                                  console.log(quizResultDataErr);
                                  return reject(quizResultDataErr);
                                } else {
                                  let failedStudents = [];
                                  let passedStudentsOfParticularQuiz = 0;
                                  console.log(
                                    "-----quizResultDataRes.Items.length--------",
                                    quizResultDataRes
                                  );
                                  quizResultDataRes.Items.forEach((val) => {
                                    console.log("-----------", val.student_id);
                                  });

                                  quizResultDataRes.Items.forEach((val) => {
                                    if (val.isPassed) {
                                      passedStudentsOfParticularQuiz++;
                                    } else {
                                      failedStudents.push(val.student_id);
                                    }
                                  });

                                  failedStudents = failedStudents.map((id) => {
                                    const item = studentDataRes.Items.find(
                                      (item) => item.student_id === id
                                    );
                                    return item
                                      ? item.user_firstname +
                                          " " +
                                          user_lastname
                                      : "Student NP";
                                  });
                                  chapter.data[i][
                                    "passedStudentsOfParticularQuiz"
                                  ] = passedStudentsOfParticularQuiz;
                                  chapter.data[i][
                                    "failedStudentsOfParticularQuiz"
                                  ] = failedStudents;
                                  const ids = groupedData.map(
                                    (item) => item.id
                                  );

                                  await new Promise((resolve, reject) => {
                                    chapterRepository.fetchBulkChaptersIDName(
                                      { unit_chapter_id: ids },
                                      (chapterDataErr, chapterDataRes) => {
                                        if (chapterDataErr) {
                                          console.log(chapterDataErr);
                                          return reject(chapterDataErr);
                                        } else {
                                          groupedData.map((val) => {
                                            let present =
                                              chapterDataRes.Items.find((ele) =>
                                                  ele.chapter_id == val.id
                                              );
                                            if (present)
                                              val.chapterName =
                                                present.chapter_title;
                                          });
                                          resolve();
                                        }
                                      }
                                    );
                                  });
                                  const allTopicIds = groupedData.flatMap((chapter) =>
                                      chapter.data.flatMap((quiz) =>
                                        quiz.selectedTopics.map(
                                          (topic) => topic.topic_id
                                        )
                                      )
                                  );

                                  await new Promise((resolve, reject) => {
                                    topicRepository.fetchBulkTopicsIDName(
                                      { unit_Topic_id: allTopicIds },
                                      (topicDataErr, topicDataRes) => {
                                        if (topicDataErr) {
                                          console.log(topicDataErr);
                                          return reject(topicDataErr);
                                        } else {
                                          groupedData.forEach((item) => {
                                            item.data.forEach((entry) => {
                                              entry.selectedTopics.forEach(
                                                (topic) => {
                                                  const detail = topicDataRes.Items.find((detail) =>
                                                        detail.topic_id === topic.topic_id
                                                    );
                                                  if (detail) {
                                                    topic.topic_title = detail.topic_title;
                                                  }
                                                }
                                              );
                                            });
                                          });

                                          resolve();
                                        }
                                      }
                                    );
                                  });

                                  resolve();
                                }
                              }
                            );
                          });
                        })
                      );
                    })
                  );

                  // After processing all data

                  return groupedData;
                };

                processQuizResults()
                  .then((result) => {
                    callback(0, result);
                  })
                  .catch((error) => {
                    callback(500, error);
                  });

                // return groupedData;
              };
              constant.quizSetDetails;
              groupByChapterId(quizDataRes.Items);
            }
          }
        );
        //   console.log(sortedAndGroupedData);
      }
    }
  );
}})
};

exports.getAssesmentSummaryDetails = (request, callback) => {


  // await chapterRepository

  const data = {
    preLearningTopics: {
      content: "62.5%",
      targetCount: 220,
      completedCount: 220,
      totalTopics: 20,
      completedTopics: 10,
      skippedTopics: 5,
      remainingTopics: 5,
    },
    postLearningTopics: {
      content: "62.5%",
      targetCount: 220,
      completedCount: 220,
      totalTopics: 20,
      completedTopics: 10,
      skippedTopics: 5,
      remainingTopics: 5,
    },
    WorksheetsGenerated: {
      content: 28,
    },
    QuestionPapersGenerated: {
      content: 13,
    },
  };
  callback(0, data);
};

exports.preLearningSummaryDetails = (request, callback) => {

  try{
    schoolRepository.getSchoolDetailsById(
      request,
      (schoolDataErr, schoolDataRes) => {
        if (schoolDataErr) {
          console.log(schoolDataErr);
          callback(schoolDataErr, schoolDataRes);
        } else {
          console.log("----------------coming-------------------",request);
          const classPercentagePre =
            schoolDataRes.Items[0].pre_quiz_config.class_percentage_for_report;
          const classPercentagePost =
            schoolDataRes.Items[0].post_quiz_config.class_percentage_for_report;
  
          studentRepository.getStudentsData(
            request,
            function (
              fetch_teacher_section_students_err,
              fetch_teacher_section_students_response
            ) {
              if (fetch_teacher_section_students_err) {
                console.log(fetch_teacher_section_students_err);
                callback(
                  fetch_teacher_section_students_err,
                  fetch_teacher_section_students_response
                );
              } else {
  
                const studentsCount = fetch_teacher_section_students_response.Items.length;
  
                subjectRepository.getSubjetById(
                  request,
                  function (subject_err, subject_res) {
                    if (subject_err) {
                      console.log(subject_err);
                      console.log("----------------getSubjetById-------------------");
  
                      callback(subject_err, subject_res);
                    } else {
                      if (subject_res.Items.length > 0) {
                        let subject_unit_id =
                          subject_res.Items[0].subject_unit_id;
  
                        unitRepository.fetchUnitData(
                          { subject_unit_id: subject_unit_id },
                          async function (unit_err, unit_res) {
                            if (unit_err) {
                              console.log(unit_err);
                              console.log("----------------fetchUnitData-------------------");
  
                              callback(unit_err, unit_res);
                            } else {
                              if (unit_res.Items.length > 0) {
                                let unit_chapter_id = [];
  
                                await unit_res.Items.forEach((e) =>
                                  unit_chapter_id.push(...e.unit_chapter_id)
                                );
  
                                chapterRepository.fetchBulkChaptersIDName(
                                  { unit_chapter_id: unit_chapter_id },
                                  function (chapter_err, chapter_res) {
                                    if (chapter_err) {
  
                                      // console.log("----------------fetchBulkChaptersIDName-------------------");
                                      console.log(chapter_err);
                                      callback(chapter_err, chapter_res);
                                    } else {
                                      quizRepository.fetchAllQuizBasedonSubject(
                                        request,
                                        async (quizDataErr, quizDataRes) => {
                                          if (quizDataErr) {
                                            console.log(quizDataErr);
                                            callback(quizDataErr, quizDataRes);
                                          } else {
                                            console.log("---------------------------quizDataRes-------------------------------------");
                                            console.log("---------------------",quizDataRes);
                                            // chapter_res.items.map(val =>)
                                            // const quiz =  quizDataRes.Items.find(val => val.learningType == 'preLearning');
                                            quizDataRes.Items.forEach(quiz => {
                                              if (quiz.learningType === 'preLearning') {
                                                  // Find the matching chapter by chapter_id
                                                  const chapter = chapter_res.Items.find(ch => ch.chapter_id === quiz.chapter_id);
                                                  if (chapter) {
                                                      // Push the quiz_id to the prelearning_topic_id array
                                                      chapter.quiz_id = quiz.quiz_id;
                                                      chapter.startDate = quiz.quizStartDate.dd_mm_yyyy;
                                                      
                                                  }
                                              }
                                          });
                                          await Promise.all(
                                            chapter_res.Items.map(val => {
                                              val.totalStrength = studentsCount;
                                                if (val.quiz_id) {
                                                    return new Promise((resolve, reject) => {
                                                        quizResultRepository.fetchQuizResultByQuizId(
                                                            { data: { quiz_id: val.quiz_id } },
                                                            (quizResultDataErr, quizResultDataRes) => {
                                                                if (quizResultDataErr) {
                                                                    console.log(quizResultDataErr);
                                                                    return reject(quizResultDataErr);
                                                                } else {
                                                                    let totalmarks = 0;
                                                                    val.student_attendance = quizResultDataRes.Items.length;
                                        
                                                                    quizResultDataRes.Items.forEach(result => {
                                                                        totalmarks += result.marks_details[0].totalMark || 0;
                                                                    });
                                        
                                                                    val.avgMarks = quizResultDataRes.Items.length > 0 ? (totalmarks / quizResultDataRes.Items.length) : 0;
                                                                    
                                                                    resolve();
                                                                }
                                                            }
                                                        );
                                                    });
                                                } else {
                                                    return Promise.resolve();
                                                }
                                            })
                                        );

                                            // console.log(quiz);
                                            callback(0, chapter_res);
                                            
                                          }
                                        }
                                      )
                                    }
                                  }
                                )
                              }
                            }
                          }
                        )
                      }
                    }
                  }
                )
              }
            })
          }
        }
       )
      }
      catch (error) {
        console.error(error);
        callback(error);
      }
    }



