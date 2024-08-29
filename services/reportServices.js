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
const classTestRepository = require("../repository/classTestRepository");
const chapterRepository = require("../repository/chapterRepository");
const topicRepository = require("../repository/topicRepository");
const conceptRepository = require("../repository/conceptRepository");
const userRepository = require("../repository/userRepository");
const { getS3SignedUrl, cleanAthenaResponse } = require("../helper/helper");

exports.getAssessmentDetails = async (request) => {
  
    const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);
    const classPercentagePre = schoolDataRes.Items[0].pre_quiz_config.class_percentage_for_report;
    const classPercentagePost = schoolDataRes.Items[0].post_quiz_config.class_percentage_for_report;

    const fetch_teacher_section_students_response = await studentRepository.getStudentsData2(request);
    const studentsCount = fetch_teacher_section_students_response.Items.length;

    const subject_res = await subjectRepository.getSubjetById2(request);
    let subject_unit_id = subject_res.Items[0].subject_unit_id;

    const unit_res = await unitRepository.fetchUnitData2({ subject_unit_id });
    console.log("subject_unit_id", subject_unit_id);

    let unit_chapter_id = [];
    unit_res.Items.forEach((e) => unit_chapter_id.push(...e.unit_chapter_id));

    const chapter_res = await chapterRepository.fetchBulkChaptersIDName2({ unit_chapter_id });

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

    const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);
    const quizIds = quizDataRes.Items.map((val) => val.quiz_id);

    const quizResultDataRes = await quizResultRepository.fetchBulkQuizResultsByID2({ unit_Quiz_id: quizIds });
    console.log("quizResultDataRes", quizResultDataRes);

    // Iterate over each quiz and process the results
    quizDataRes.Items.forEach((val) => {
      const studentsAttendedQuiz = quizResultDataRes.filter((res) => res.quiz_id === val.quiz_id).length;

      if (val.learningType === "preLearning") {
        if (val.not_considered_topics) notConsideredTopicsPre += val.not_considered_topics.length;
        if (studentsCount && studentsAttendedQuiz >= (classPercentagePre * studentsCount * 0.01)) {
          preLearningCompletedTopicsCount += val.selectedTopics.length;
        }
      } else {
        if (val.not_considered_topics) notConsideredTopicsPost += val.not_considered_topics.length;
        if (studentsCount && studentsAttendedQuiz >= (classPercentagePost * studentsCount * 0.01)) {
          postLearningCompletedTopicsCount += val.selectedTopics.length;
        }
      }
    });

    return {
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
    };
  
};





exports.getTargetedLearningExpectation = async (request, callback) => {
  let classStrength = 0;
  let totalTopics = 0;
  let reachedTopics = 0;

  try {
    schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
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
                        console.log("------val---", val);
                        if (val.isPassed)
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

        console.log("quizDataRes = ", quizDataRes);

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

        console.log("quizResultDataRes = ", quizResultDataRes);

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


exports.viewAnalysisIndividualReport = async (request, callback) => {
  try {
    const quizData = await quizRepository.fetchQuizDataById2(request);


    const studentsDataRes = await new Promise((resolve, reject) => {
      quizResultRepository.fetchQuizResultDataOfStudent(request, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });
    console.log(studentsDataRes.Items[0].marks_details, "&&&&&&&&&&&&&&&&&&&&&&&&&&&", quizData.Item.question_track_details);

    if (quizData.Item && studentsDataRes.Items[0]) {
      let questionIds = quizData.Item.question_track_details[studentsDataRes.Items[0].marks_details.set_key].map((val) => {
        return val.question_id;
      })

      const topicIds = quizData.Item.question_track_details[studentsDataRes.Items[0].marks_details.set_key].map((val) => {
        return val.topic_id;
      })


      const questions = await new Promise((resolve, reject) => {
        questionRepository.fetchBulkQuestionsNameById({ question_id: questionIds }, (err, res) => {
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


      const cognitive_id = questions.Items.map(que => que.cognitive_skill)

      const cognitiveSkillNames = await new Promise((resolve, reject) => {
        settingsRepository.fetchBulkCognitiveSkillNameById({ cognitive_id: cognitive_id }, (err, res) => {
          if (err) {
            console.log(err);
            return reject(err);
          }
          resolve(res);
        });
      });
      questions.Items.map(async que => {
        const ans = quizData.Item.question_track_details[studentsDataRes.Items[0].marks_details.set_key].find((val) => val.question_id == que.question_id);

        que.topic_title = topicNames.Items.find(val =>
          val.topic_id == ans.topic_id
        ).topic_title;

        que.cognitive_skill = cognitiveSkillNames.Items.find(val =>
          val.cognitive_id == que.cognitive_skill
        )
        que.cognitive_skill = que.cognitive_skill ? que.cognitive_skill.cognitive_name : "";


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
      callback(null, questions)
    }
    else
      callback(null, [])
  }
  catch (error) {
    console.error(error);
    callback(error);
  }
}

exports.preLearningBlueprintDetails = async (request) => {

  const quizData = await quizRepository.fetchQuizDataById2(request);

  const quizResultData = await quizResultRepository.fetchQuizResultByQuizId(request);

  const aggregatedData = {};

  if (quizData.Item.question_track_details)
    for (const [setKey, questions] of Object.entries(quizData.Item.question_track_details)) {

      questions.forEach((question, index) => {
        if (!aggregatedData[question.question_id]) {
          // Find the topic_id and concept_id from question_track_details
          aggregatedData[question.question_id] = {
            topic_id: question?.topic_id,
            concept_id: question?.concept_id,
            total_marks: 0,
            count: 0,
          };
        }
      });
    }

  quizResultData.Items.length > 0 && quizResultData.Items.forEach((result, i) => {
    if (result.marks_details) {
      const marksDetails = result.marks_details;
      marksDetails[0].qa_details.forEach((question) => {
        const questionId = question.question_id;
        const obtainedMarks = question.obtained_marks;

        // Check if the question_id already exists in aggregatedData
        if (!aggregatedData[questionId]) {
          // Find the topic_id and concept_id from question_track_details
          const trackDetails = quizData.Item.question_track_details;

          const topicConceptGroup = trackDetails[
            marksDetails[0].set_key
          ].find((q) => q.question_id === questionId);

          // Initialize the question data
          aggregatedData[questionId] = {
            topic_id: topicConceptGroup?.topic_id,
            concept_id: topicConceptGroup?.concept_id,
            total_marks: obtainedMarks,
            count: 1,
          };
        } else {
          // Update the existing data
          aggregatedData[questionId].total_marks += obtainedMarks;
          aggregatedData[questionId].count += 1;
        }
      });
    }
  });

  // Calculate averages

  const averages = Object.keys(aggregatedData).map((questionId) => {
    const data = aggregatedData[questionId];
    const marks = 3;
    return {
      question_id: questionId,
      topic_id: data.topic_id,
      concept_id: data.concept_id,
      average_marks: (data.total_marks / (data.count * marks)) * 100,
    };
  });

  const conceptIds = [];
  const topicIds = [];

  averages.forEach((item) => {
    conceptIds.push(item.concept_id);
    topicIds.push(item.topic_id);
  });

  const topicNames = topicIds.length && await topicRepository.fetchBulkTopicsIDName2({ unit_Topic_id: topicIds });

  const conceptNames = conceptIds.length && await conceptRepository.fetchBulkConceptsIDName2({ unit_Concept_id: conceptIds });

  averages.map((item) => {
    item.topic_title = topicNames.find(val =>
      val.topic_id == item.topic_id
    ).topic_title;
    item.concept_title = conceptNames.find(val =>
      val.concept_id == item.concept_id
    ).concept_title;
  })

  const conceptMap = new Map();

  // Step 1: Calculate concept averages
  averages.forEach(({ concept_id, topic_id, topic_title, average_marks, concept_title }) => {
    const conceptData = conceptMap.get(concept_id) || { totalScore: 0, count: 0, topic_id, topic_title, concept_title };
    conceptData.totalScore += average_marks;
    conceptData.count += 1;
    conceptMap.set(concept_id, conceptData);
  });

  const conceptAverages = [...conceptMap].map(([concept_id, { totalScore, count, topic_id, topic_title, concept_title }]) => ({
    concept_id,
    topic_id,
    topic_title,
    concept_title,
    average_score: totalScore / count,
    number_of_questions: count,
  }));

  // Step 2: Calculate topic averages based on concept averages
  const topicMap = new Map();

  conceptAverages.forEach(({ topic_id, topic_title, average_score }) => {
    const topicData = topicMap.get(topic_id) || { totalScore: 0, count: 0, topic_title };
    topicData.totalScore += average_score;
    topicData.count += 1;
    topicMap.set(topic_id, topicData);
  });


  const topicAverages = [...topicMap].map(([topic_id, { totalScore, count, topic_title }]) => ({
    topic_id,
    topic_title, // Include topic_title in the topic data
    topic_average_score: totalScore / count,
    number_of_concepts: count,
  }));

  // Step 3: Combine topic and concept data for UI display
  const displayData = topicAverages.map((topic) => ({
    ...topic,
    concepts: conceptAverages.filter((concept) => concept.topic_id === topic.topic_id),
  }));

  return displayData;

};

exports.fetchIndividualQuizReport = async (request) => {

  const quizResults = await quizResultRepository.fetchQuizResultByQuizId(request);

  const AllstudentsData = await classTestRepository.getStudentInfo(request);
  AllstudentsData.Items.map(studentData => {
    const studentResult = quizResults.Items.find(quizResult => studentData.student_id == quizResult.student_id);
    if (studentResult)
      studentData.individual_group_performance = studentResult.individual_group_performance;
  })

  return AllstudentsData;
};