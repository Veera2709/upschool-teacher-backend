const dashboardRepository = require("../repository/dashboardRepository");
const constant = require("../constants/constant");
const schoolRepository = require("../repository/schoolRepository");
const studentRepository = require("../repository/studentRepository");
const subjectRepository = require("../repository/subjectRepository");
const teacherRepository = require("../repository/teacherRepository");
const unitRepository = require("../repository/unitRepository");
const quizRepository = require("../repository/quizRepository");
const settingsRepository = require("../repository/settingsRepository");
const questionRepository = require("../repository/questionRepository");
const quizResultRepository = require("../repository/quizResultRepository");
const chapterRepository = require("../repository/chapterRepository");
const topicRepository = require("../repository/topicRepository");
const userRepository = require("../repository/userRepository");
const { getS3SignedUrl, cleanAthenaResponse } = require("../helper/helper");

exports.getAssessmentDetails = (request, callback) => {
  try {
    schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
      if (schoolDataErr) {
        callback(schoolDataErr, schoolDataRes);
      } else {
        const classPercentagePre =
          schoolDataRes.Items[0].pre_quiz_config.class_percentage_for_report;
        const classPercentagePost =
          schoolDataRes.Items[0].post_quiz_config.class_percentage_for_report;

        studentRepository.getStudentsData(
          request,
          (fetch_teacher_section_students_err, fetch_teacher_section_students_response) => {
            if (fetch_teacher_section_students_err) {
              callback(fetch_teacher_section_students_err, fetch_teacher_section_students_response);
            } else {
              const studentsCount = fetch_teacher_section_students_response.Items.length;

              subjectRepository.getSubjetById(request, (subject_err, subject_res) => {
                if (subject_err) {
                  callback(subject_err, subject_res);
                } else {
                  if (subject_res.Items.length > 0) {
                    let subject_unit_id = subject_res.Items[0].subject_unit_id;

                    unitRepository.fetchUnitData(
                      { subject_unit_id: subject_unit_id },
                      async (unit_err, unit_res) => {
                        if (unit_err) {
                          callback(unit_err, unit_res);
                        } else {
                          if (unit_res.Items.length > 0) {
                            let unit_chapter_id = [];
                            unit_res.Items.forEach((e) => unit_chapter_id.push(...e.unit_chapter_id));

                            chapterRepository.fetchBulkChaptersIDName(
                              { unit_chapter_id: unit_chapter_id },
                              (chapter_err, chapter_res) => {
                                if (chapter_err) {
                                  callback(chapter_err, chapter_res);
                                } else {
                                  let preLearningTopicsCount = 0;
                                  let postLearningTopicsCount = 0;
                                  let preLearningCompletedTopicsCount = 0;
                                  let postLearningCompletedTopicsCount = 0;
                                  let notConsideredTopicsPre = 0;
                                  let notConsideredTopicsPost = 0;

                                  chapter_res.Items.forEach((ele) => {
                                    preLearningTopicsCount += ele.prelearning_topic_id.length;
                                    postLearningTopicsCount += ele.postlearning_topic_id.length;
                                  });

                                  quizRepository.fetchAllQuizBasedonSubject(
                                    request,
                                    async (quizDataErr, quizDataRes) => {
                                      if (quizDataErr) {
                                        callback(quizDataErr, quizDataRes);
                                      } else {
                                        // Collect all quiz IDs
                                        const quizIds = quizDataRes.Items.map((val) => val.quiz_id);
                                        // quizIds.push("615584c2-0864-5f03-9397-62d5e148a6bc");

                                        // Fetch results in bulk
                                        quizResultRepository.fetchBulkQuizResultsByID(
                                          { unit_Quiz_id: quizIds },
                                          (quizResultDataErr, quizResultDataRes) => {
                                            if (quizResultDataErr) {
                                              callback(quizResultDataErr, quizResultDataRes);
                                            } else {
                                              // Iterate over each quiz and process the results
                                              quizDataRes.Items.forEach((val) => {
                                                const studentsAttendedQuiz = quizResultDataRes.Items.filter(
                                                  (res) => res.quiz_id === val.quiz_id
                                                ).length;

                                                
                                                if (val.learningType === "preLearning") {
                                                  if (val.not_considered_topics)
                                                    notConsideredTopicsPre += val.not_considered_topics;
                                                  if ( studentsCount && studentsAttendedQuiz >= (classPercentagePre * studentsCount * 0.01)) {
                                                    preLearningCompletedTopicsCount += val.selectedTopics.length;
                                                  }
                                                } else {

                                                  if (val.not_considered_topics)
                                                    notConsideredTopicsPost += val.not_considered_topics;
                                                  if ( studentsCount && studentsAttendedQuiz >= (classPercentagePost * studentsCount * 0.01)) {
                                                    postLearningCompletedTopicsCount += val.selectedTopics.length;
                                                  }
                                                }
                                              });

                                              callback(200, {
                                                preLearningTopics: {
                                                  content: ((preLearningCompletedTopicsCount / preLearningTopicsCount) * 100).toFixed(1) + "%",
                                                  totalTopics: preLearningTopicsCount,
                                                  completedTopics: preLearningCompletedTopicsCount,
                                                  notConsideredTopics: notConsideredTopicsPre,
                                                  remainingTopics: preLearningTopicsCount - preLearningCompletedTopicsCount - notConsideredTopicsPre,
                                                },
                                                postLearningTopics: {
                                                  content: ((postLearningCompletedTopicsCount / postLearningTopicsCount) * 100).toFixed(1) + "%",
                                                  totalTopics: postLearningTopicsCount,
                                                  completedTopics: postLearningCompletedTopicsCount,
                                                  notConsideredTopics: notConsideredTopicsPost,
                                                  remainingTopics: postLearningTopicsCount - postLearningCompletedTopicsCount - notConsideredTopicsPost,
                                                },
                                                WorksheetsGenerated: {
                                                  content: 28,
                                                },
                                                QuestionPapersGenerated: {
                                                  content: 13,
                                                },
                                              });
                                            }
                                          }
                                        );
                                      }
                                    }
                                  );
                                }
                              }
                            );
                          } else {
                            callback(200, unit_res.Items);
                          }
                        }
                      }
                    );
                  } else {
                    callback(200, subject_res.Items);
                  }
                }
              });
            }
          }
        );
      }
    });
  } catch (error) {
    console.error(error);
    callback(error);
  }
};


exports.getTargetedLearningExpectation = async (request, callback) => {
  let classStrength = 0;
  let totalTopics = 0;
  let reachedTopics = 0;

  try {
    await schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
      if (schoolDataErr) {
        callback(schoolDataErr, schoolDataRes);
      } else {
        const classPercentagePre = schoolDataRes.Items[0].pre_quiz_config.class_percentage;
        const classPercentagePost = schoolDataRes.Items[0].post_quiz_config.class_percentage;

        studentRepository.getStudentsData(request, (studentDataErr, studentDataRes) => {
          if (studentDataErr) {
            callback(studentDataErr, studentDataRes);
          } else {
            classStrength = studentDataRes?.Items?.length;

            quizRepository.fetchAllQuizBasedonSubject(request, async (quizDataErr, quizDataRes) => {
              if (quizDataErr) {
                callback(quizDataErr, quizDataRes);
              } else {
                const quizIds = quizDataRes.Items.map((val) => val.quiz_id);
                totalTopics = quizDataRes.Items.reduce((acc, val) => acc + val.selectedTopics.length, 0);

                // Bulk fetch quiz results
                quizResultRepository.fetchBulkQuizResultsByID({ unit_Quiz_id: quizIds }, (quizResultDataErr, quizResultDataRes) => {
                  if (quizResultDataErr) {
                    callback(quizResultDataErr, quizResultDataRes);
                  } else {
                    quizDataRes.Items.forEach((quiz) => {
                      let passedStudentsOfParticularQuiz = 0;

                      const quizResultsForThisQuiz = quizResultDataRes.Items.filter(
                        (res) => res.quiz_id === quiz.quiz_id
                      );

                      // Calculate passed students
                      quizResultDataRes.Items.map((val) => {
                        // if (true) {
                        if(val.isPassed)
                          passedStudentsOfParticularQuiz++;
                      });

                      if (quiz.learningType == "preLearning" && schoolDataRes.Items[0].teacher_access.prequiz_targetlearning === 'Yes') {
                        if (passedStudentsOfParticularQuiz >= (classPercentagePre ? classStrength * classPercentagePre * 0.01 : 0)) {
                          reachedTopics += quiz.selectedTopics.length;
                        }
                      } else if (passedStudentsOfParticularQuiz >= (classPercentagePost ? classStrength * classPercentagePost * 0.01 : 0)) {
                        reachedTopics += quiz.selectedTopics.length;
                      }
                    });

                    callback(0, { totalTopics, reached: reachedTopics, classPercentagePre, classPercentagePost, totalStrength: classStrength });
                  }
                });
              }
            });
          }
        });
      }
    });
  } catch (error) {
    console.error(error);
    callback(error);
  }
};


exports.getTargetedLearningExpectationDetails = async (request, callback) => {
  try {
    // Fetch school details
    const schoolDataRes = await new Promise((resolve, reject) => {
      schoolRepository.getSchoolDetailsById(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    const classPercentagePre = schoolDataRes.Items[0].pre_quiz_config.class_percentage;
    const classPercentagePost = schoolDataRes.Items[0].post_quiz_config.class_percentage;

    // Fetch students data
    const studentDataRes = await new Promise((resolve, reject) => {
      studentRepository.getStudentsData(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    const classStrength = studentDataRes.Items.length;

    // Fetch quiz data
    const quizDataRes = await new Promise((resolve, reject) => {
      quizRepository.fetchAllQuizBasedonSubject(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    // Group quizzes by chapter_id
    const groupByChapterId = (data) => {
      data.sort((a, b) => a.chapter_id.localeCompare(b.chapter_id));

      const groupedData = data.reduce((acc, item) => {
        const chapterId = item.chapter_id;
        const chapterIndex = acc.findIndex(chapter => chapter.id === chapterId);

        const quizData = {
          selectedTopics: item.selectedTopics,
          quiz_id: item.quiz_id,
          passedStudentsOfParticularQuiz: item.passedStudentsOfParticularQuiz,
          failedStudentsOfParticularQuiz: item.failedStudentsOfParticularQuiz,
          learningType: item.learningType,
          date: item.quizStartDate.dd_mm_yyyy,
        };

        if (chapterIndex === -1) {
          acc.push({
            id: chapterId,
            chapterName: "", 
            classPercentagePost,
            classPercentagePre,
            totalStrength: classStrength,
            data: [quizData],
          });
        } else {
          acc[chapterIndex].data.push(quizData);
        }

        return acc;
      }, []);

      return groupedData;
    };

    const groupedData = groupByChapterId(quizDataRes.Items);

    // Fetch quiz results in bulk
    const quizIds = groupedData.flatMap(chapter => chapter.data.map(quiz => quiz.quiz_id));
    const quizResultDataRes = await new Promise((resolve, reject) => {
      quizResultRepository.fetchBulkQuizResultsByID({ unit_Quiz_id: quizIds }, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    // Fetch chapters and topics in bulk
    const chapterIds = groupedData.map(chapter => chapter.id);
    const chapterDataRes = await new Promise((resolve, reject) => {
      chapterRepository.fetchBulkChaptersIDName({ unit_chapter_id: chapterIds }, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    const allTopicIds = groupedData.flatMap(chapter => 
      chapter.data.flatMap(quiz => quiz.selectedTopics.map(topic => topic.topic_id))
    );
    const topicDataRes = await new Promise((resolve, reject) => {
      topicRepository.fetchBulkTopicsIDName({ unit_Topic_id: allTopicIds }, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    // Process quiz results and update grouped data
    groupedData.forEach(chapter => {
      chapter.data.forEach(quiz => {
        const results = quizResultDataRes.Items.filter(result => result.quiz_id === quiz.quiz_id);
        const failedStudents = [];
        let passedStudentsOfParticularQuiz = 0;

        results.forEach(result => {
          if (result.isPassed) {
            passedStudentsOfParticularQuiz++;
          } else {
            failedStudents.push(result.student_id);
          }
        });

        quiz.passedStudentsOfParticularQuiz = passedStudentsOfParticularQuiz;
        quiz.failedStudentsOfParticularQuiz = failedStudents.map(id => {
          const student = studentDataRes.Items.find(item => item.student_id === id);
          return student ? `${student.user_firstname} ${student.user_lastname}` : "Student NP";
        });
      });
    });

    // Update chapter names and topic titles
    groupedData.forEach(chapter => {
      const chapterData = chapterDataRes.Items.find(c => c.chapter_id === chapter.id);
      if (chapterData) {
        chapter.chapterName = chapterData.chapter_title;
      }

      chapter.data.forEach(quiz => {
        quiz.selectedTopics.forEach(topic => {
          const topicDetail = topicDataRes.Items.find(t => t.topic_id === topic.topic_id);
          if (topicDetail) {
            topic.topic_title = topicDetail.topic_title;
          }
        });
      });
    });

    callback(null, groupedData);
  } catch (error) {
    console.error(error);
    callback(error);
  }
};


exports.preLearningSummaryDetails = async (request, callback) => {
  try {
    const studentsDataRes = await new Promise((resolve, reject) => {
      studentRepository.getStudentsData(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    const studentsCount = studentsDataRes.Items.length;

    const subjectDataRes = await new Promise((resolve, reject) => {
      subjectRepository.getSubjetById(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    if (subjectDataRes.Items.length > 0) {
      const subject_unit_id = subjectDataRes.Items[0].subject_unit_id;

      const unitDataRes = await new Promise((resolve, reject) => {
        unitRepository.fetchUnitData({ subject_unit_id }, (err, res) => {
          if (err) {
            console.log(err);
            return reject(err);
          }
          resolve(res);
        });
      });

      if (unitDataRes.Items.length > 0) {
        let unit_chapter_id = [];
        unitDataRes.Items.forEach((e) => unit_chapter_id.push(...e.unit_chapter_id));

        const chapterDataRes = await new Promise((resolve, reject) => {
          chapterRepository.fetchBulkChaptersIDName({ unit_chapter_id }, (err, res) => {
            if (err) {
              console.log(err);
              return reject(err);
            }
            resolve(res);
          });
        });

        const quizDataRes = await new Promise((resolve, reject) => {
          quizRepository.fetchAllQuizBasedonSubject(request, (err, res) => {
            if (err) {
              console.log(err);
              return reject(err);
            }
            resolve(res);
          });
        });

        const quizIds = [];
        quizDataRes.Items.forEach((quiz) => {
          if (quiz.learningType === request.data.type) {
            const chapter = chapterDataRes.Items.find((ch) => ch.chapter_id === quiz.chapter_id);
            if (chapter) {
              chapter.quiz_id = quiz.quiz_id;
              chapter.startDate = quiz.quizStartDate.dd_mm_yyyy;
              chapter.notConsideredTopics = quiz.not_considered_topics;
              quizIds.push(quiz.quiz_id);
            }
          }
        });

        // Fetch quiz results in bulk
        const quizResultDataRes = await new Promise((resolve, reject) => {
          quizResultRepository.fetchBulkQuizResultsByID({ unit_Quiz_id: quizIds }, (err, res) => {
            if (err) {
              console.log(err);
              return reject(err);
            }
            resolve(res);
          });
        });

        const topicIds = [];
        chapterDataRes.Items.forEach((val) => {
          val.totalStrength = studentsCount;  // Preserve totalStrength

          if (val.notConsideredTopics) {
            topicIds.push(...val.notConsideredTopics);
          }

          if (val.quiz_id) {
            const quizResults = quizResultDataRes.Items.filter((result) => result.quiz_id === val.quiz_id);
            let totalMarks = 0;

            val.student_attendance = quizResults.length;

            quizResults.forEach((result) => {
              totalMarks += result.marks_details[0]?.totalMark || 0;
            });

            val.avgMarks = quizResults.length > 0 ? totalMarks / quizResults.length : 0;
          }
        });

        if (topicIds.length > 0) {
          const topicDataRes = await new Promise((resolve, reject) => {
            topicRepository.fetchBulkTopicsIDName({ unit_Topic_id: topicIds }, (err, res) => {
              if (err) {
                console.log(err);
                return reject(err);
              }
              resolve(res);
            });
          });

          chapterDataRes.Items.forEach((val) => {
            if (val.notConsideredTopics) {
              val.notConsideredTopics = val.notConsideredTopics.map((id) => {
                const topic = topicDataRes.Items.find((item) => item.topic_id === id);
                return topic ? topic.topic_title : id;
              });
            }
          });
        }

        callback(null, chapterDataRes);
      }
    }
  } catch (error) {
    console.error(error);
    callback(error);
  }
};


exports.postLearningSummaryDetails = async (request, callback) => {
  try {
    const studentsDataRes = await new Promise((resolve, reject) => {
      studentRepository.getStudentsData(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    const studentsCount = studentsDataRes.Items.length;

    const subjectDataRes = await new Promise((resolve, reject) => {
      subjectRepository.getSubjetById(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    if (subjectDataRes.Items.length > 0) {
      const subject_unit_id = subjectDataRes.Items[0].subject_unit_id;

      const unitDataRes = await new Promise((resolve, reject) => {
        unitRepository.fetchUnitData({ subject_unit_id }, (err, res) => {
          if (err) {
            console.log(err);
            return reject(err);
          }
          resolve(res);
        });
      });

      if (unitDataRes.Items.length > 0) {
        let unit_chapter_id = [];
        unitDataRes.Items.forEach((e) => unit_chapter_id.push(...e.unit_chapter_id));

        const chapterDataRes = await new Promise((resolve, reject) => {
          chapterRepository.fetchBulkChaptersIDName({ unit_chapter_id }, (err, res) => {
            if (err) {
              console.log(err);
              return reject(err);
            }
            resolve(res);
          });
        });

        const topicIds = [];
        const quizDataRes = await new Promise((resolve, reject) => {
          quizRepository.fetchAllQuizBasedonSubject(request, (err, res) => {
            if (err) {
              console.log(err);
              return reject(err);
            }
            resolve(res);
          });
        });

        quizDataRes.Items.forEach((quiz) => {
          if (quiz.not_considered_topics) {
            topicIds.push(...quiz.not_considered_topics);
          }
          if (quiz.learningType === request.data.type) {
            const chapter = chapterDataRes.Items.find((ch) => ch.chapter_id === quiz.chapter_id);
            if (chapter) {
              if (!chapter.quiz_id) {
                chapter.quiz_id = [];
                chapter.notConsideredTopics = [];
              }
              chapter.quiz_id.push({
                id: quiz.quiz_id,
                name: quiz.quiz_name,
              });
              if (quiz.not_considered_topics) {
                chapter.notConsideredTopics.push(...quiz.not_considered_topics);
              }
              chapter.startDate = quiz.quizStartDate.dd_mm_yyyy;
            }
          }
        });

        // Fetch quiz results in bulk
        const quizIds = chapterDataRes.Items.flatMap((val) => val.quiz_id ? val.quiz_id.map((quiz) => quiz.id) : []);
        const quizResultDataRes = await new Promise((resolve, reject) => {
          quizResultRepository.fetchBulkQuizResultsByID({ unit_Quiz_id: quizIds }, (err, res) => {
            if (err) {
              console.log(err);
              return reject(err);
            }
            resolve(res);
          });
        });

        // Process quiz results
        chapterDataRes.Items.forEach((val) => {
          val.totalStrength = studentsCount;

          if (Array.isArray(val.quiz_id) && val.quiz_id.length > 0) {
            val.quiz_id.forEach((quiz) => {
              const quizResults = quizResultDataRes.Items.filter((result) => result.quiz_id === quiz.id);
              let totalMarks = 0;
              let totalAttendance = 0;

              totalAttendance = quizResults.length;
              quizResults.forEach((result) => {
                totalMarks += result.marks_details[0]?.totalMark || 0;
              });

              quiz.student_attendance = totalAttendance;
              quiz.avgMarks = totalAttendance > 0 ? totalMarks / totalAttendance : 0;
            });
          }
        });

        if (topicIds.length > 0) {
          const topicDataRes = await new Promise((resolve, reject) => {
            topicRepository.fetchBulkTopicsIDName({ unit_Topic_id: topicIds }, (err, res) => {
              if (err) {
                console.log(err);
                return reject(err);
              }
              resolve(res);
            });
          });

          chapterDataRes.Items.forEach((val) => {
            if (val.notConsideredTopics) {
              val.notConsideredTopics = val.notConsideredTopics.map((id) => {
                const topic = topicDataRes.Items.find((item) => item.topic_id === id);
                return topic ? topic.topic_title : id;
              });
            }
          });
        }

        callback(null, chapterDataRes);
      }
    }
  } catch (error) {
    console.error(error);
    callback(error);
  }
};


exports.viewAnalysisIndividualReport = async (request, callback) =>
{
  try{
       const quizData = await new Promise((resolve, reject) => {
        quizRepository.fetchQuizDataById(request, (err, res) => {
          if (err) {
            console.log(err);
            return reject(err);
          }
          resolve(res);
        });
      });


    const studentsDataRes = await new Promise((resolve, reject) => {
      quizResultRepository.fetchQuizResultDataOfStudent(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

if(quizData.Item && studentsDataRes.Items[0] )
{
  let questionIds =  quizData.Item.question_track_details[studentsDataRes.Items[0].marks_details.set_key].map((val)=>
  {
    return val.question_id;
  })

    const topicIds =  quizData.Item.question_track_details[studentsDataRes.Items[0].marks_details.set_key].map((val)=>
    {
   return val.topic_id;
    })


    const questions = await new Promise((resolve, reject) => {
      questionRepository.fetchBulkQuestionsNameById({question_id : questionIds }, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });

    const topicNames = await new Promise((resolve, reject) => {
      topicRepository.fetchBulkTopicsIDName({ unit_Topic_id: topicIds }, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });


    const cognitive_id = questions.Items.map(que => que.cognitive_skill )

    const cognitiveSkillNames = await new Promise((resolve, reject) => {
      settingsRepository.fetchBulkCognitiveSkillNameById({ cognitive_id: cognitive_id }, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });
    questions.Items.map(async que =>
      {
        const ans = quizData.Item.question_track_details[studentsDataRes.Items[0].marks_details.set_key].find((val)=> val.question_id == que.question_id );

        que.topic_title = topicNames.Items.find(val =>
            val.topic_id == ans.topic_id
          ).topic_title;

          que.cognitive_skill = cognitiveSkillNames.Items.find(val =>
            val.cognitive_id == que.cognitive_skill
          )
          que.cognitive_skill = que.cognitive_skill ? que.cognitive_skill.cognitive_name : "" ;


          que.obtained_marks = studentsDataRes.Items[0].marks_details.qa_details.find(val =>
            val.question_id == que.question_id
          ).obtained_marks;

          await Promise.all(
            que.answers_of_question.map(async ans => {
                if (ans.answer_type === "Image" || ans.answer_type === "Audio File") {
                    ans.answer_content = await getS3SignedUrl(ans.answer_content);
                }
                return ans; // Make sure to return the updated answer
            })
        );
      }
    )
    callback(null , questions)
}
else
callback(null , [])
  } 
  catch (error) {
  console.error(error);
  callback(error);
  }
}
