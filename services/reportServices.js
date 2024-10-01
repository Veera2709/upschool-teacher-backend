const { schoolRepository, studentRepository, subjectRepository, unitRepository, quizRepository, settingsRepository, questionRepository, quizResultRepository, classTestRepository, chapterRepository, topicRepository, conceptRepository } = require("../repository")
const { getS3SignedUrl, cleanAthenaResponse, formatDate } = require("../helper/helper");

exports.getAssessmentDetails = async (request) => {

  const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);
  const classPercentagePre = schoolDataRes.Items[0].pre_quiz_config.class_percentage_for_report;
  const classPercentagePost = schoolDataRes.Items[0].post_quiz_config.class_percentage_for_report;

  const fetch_teacher_section_students_response = await studentRepository.getStudentsData2(request);
  const studentsCount = fetch_teacher_section_students_response.Items.length;

  const subject_res = await subjectRepository.getSubjetById2(request);
  let subject_unit_id = subject_res.Items[0].subject_unit_id;

  const unit_res = await unitRepository.fetchUnitData2({ subject_unit_id });

  const unit_chapter_id = [...new Set(unit_res.flatMap(e => e.unit_chapter_id))];
  const chapter_res = await chapterRepository.fetchBulkChaptersIDName2({ unit_chapter_id });

  let preLearningTopicsCount = 0;
  let postLearningTopicsCount = 0;
  let preLearningCompletedTopicsCount = 0;
  let postLearningCompletedTopicsCount = 0;
  let notConsideredTopicsPre = 0;
  let notConsideredTopicsPost = 0;

  chapter_res.forEach((ele) => {
    preLearningTopicsCount += ele.prelearning_topic_id.length;
    postLearningTopicsCount += ele.postlearning_topic_id.length;
  });

  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);

  const quizIds = quizDataRes.Items.map(val => val.quiz_id);

  const quizResultDataRes = quizIds.length && await quizResultRepository.fetchBulkQuizResultsByID2({ unit_Quiz_id: quizIds })

  quizDataRes.Items.forEach((val) => {
    const studentsAttendedQuiz = quizResultDataRes ? quizResultDataRes.filter((res) => res.quiz_id === val.quiz_id).length : 0;

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

exports.getTargetedLearningExpectation = async (request) => {
  let totalTopics = 0;
  let reachedTopics = 0;
  const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request)
  const classPercentagePre = schoolDataRes.Items[0].pre_quiz_config.class_percentage;
  const classPercentagePost = schoolDataRes.Items[0].post_quiz_config.class_percentage;

  if (!classPercentagePre || !classPercentagePost) return;
  const studentDataRes = await studentRepository.getStudentsData2(request)
  let classStrength = studentDataRes?.Items?.length;
  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);
  const quizIds = quizDataRes.Items.map(val => val.quiz_id);

  const quizResultDataRes = quizIds.length && await quizResultRepository.fetchBulkQuizResultsByID2({ unit_Quiz_id: quizIds })

  totalTopics = quizDataRes && quizDataRes.Items.reduce((acc, val) => acc + val.selectedTopics?.length, 0);

  quizDataRes.Items.forEach((quiz) => {

    const passedStudentsOfParticularQuiz = quizResultDataRes.filter(val => val.isPassed).length;

    const classPercentage = quiz.learningType === "preLearning" ? classPercentagePre : classPercentagePost;
    const passedThreshold = classPercentage ? classStrength * classPercentage * 0.01 : 0;

    if (passedStudentsOfParticularQuiz >= passedThreshold) {
      reachedTopics += quiz.selectedTopics.length;
    }
  });
  return { totalTopics, reached: reachedTopics, classPercentagePre, classPercentagePost, totalStrength: classStrength };
}

exports.getTargetedLearningExpectationDetails = async (request) => {

  const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);
  const classPercentagePre = schoolDataRes.Items[0].pre_quiz_config.class_percentage;
  const classPercentagePost = schoolDataRes.Items[0].post_quiz_config.class_percentage;
  const studentDataRes = await studentRepository.getStudentsData2(request);
  const classStrength = studentDataRes.Items.length;
  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);

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
        date: formatDate(item.created_ts),
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
  const quizIds = groupedData.flatMap(chapter => chapter.data.map((quiz) => ({ "quiz_id": quiz.quiz_id })));
  const quizResultDataRes = await quizResultRepository.fetchBulkQuizResultsByID3({ items: quizIds, condition: "OR" })
  const chapterIds = groupedData.map(chapter => chapter.id);

  const chapterDataRes = await chapterRepository.fetchBulkChaptersIDName2({ unit_chapter_id: chapterIds })

  const allTopicIds = groupedData.flatMap(chapter =>
    chapter.data.flatMap(quiz => quiz.selectedTopics.map(topic => topic.topic_id))
  );

  const topicDataRes = await topicRepository.fetchBulkTopicsIDName2({ unit_Topic_id: allTopicIds });

  groupedData.forEach(chapter => {
    chapter.data.forEach(quiz => {
      const results = quizResultDataRes.filter(result => result.quiz_id === quiz.quiz_id);
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
        return student ? `${student.user_firstname} ${student.user_lastname}` : "";
      });
    });
  });

  groupedData.forEach(chapter => {
    const chapterData = chapterDataRes.find(c => c.chapter_id === chapter.id);
    if (chapterData) {
      chapter.chapterName = chapterData.chapter_title;
    }
    chapter.data.forEach(quiz => {
      quiz.selectedTopics.forEach(topic => {
        const topicDetail = topicDataRes.find(t => t.topic_id === topic.topic_id);
        if (topicDetail) {
          topic.topic_title = topicDetail.topic_title;
        }
      });
    });
  });
  return (groupedData);
};


exports.preLearningSummaryDetails = async (request) => {
  const studentsDataRes = await studentRepository.getStudentsData2(request);
  const studentsCount = studentsDataRes.Items.length;

  const subjectDataRes = await subjectRepository.getSubjetById2(request);

  if (!subjectDataRes.Items?.length) return;

  const subject_unit_id = subjectDataRes.Items[0].subject_unit_id;
  const unitDataRes = await unitRepository.fetchUnitData2({ subject_unit_id });

  if (!unitDataRes?.length) return;

  const unit_chapter_id = [...new Set(unitDataRes.flatMap(e => e.unit_chapter_id))];
  const chapterDataRes = await chapterRepository.fetchBulkChaptersIDName2({ unit_chapter_id });

  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);

  const quizIds = [];
  quizDataRes.Items.forEach((quiz) => {
    if (quiz.learningType === request.data.type) {
      const chapter = chapterDataRes.find((ch) => ch.chapter_id === quiz.chapter_id);
      if (chapter) {
        Object.assign(chapter, {
          quiz_id: quiz.quiz_id,
          startDate: formatDate(quiz.created_ts),
          notConsideredTopics: quiz.not_considered_topics,
        });
        quizIds.push(quiz.quiz_id);
      }
    }
  });

  const quizResultDataRes = await quizResultRepository.fetchBulkQuizResultsByID2({ unit_Quiz_id: quizIds });

  // Calculate average marks and attendance
  const topicIds = [];
  chapterDataRes.forEach((val) => {
    val.totalStrength = studentsCount;
    if (val.notConsideredTopics) topicIds.push(...val.notConsideredTopics);

    if (val.quiz_id) {
      const quizResults = quizResultDataRes.filter((result) => result.quiz_id === val.quiz_id);
      val.student_attendance = quizResults.length;
      val.avgMarks = quizResults.length ? quizResults.reduce((total, result) => total + (result.marks_details[0]?.totalMark || 0), 0) / quizResults.length : 0;
    }
  });

  // Fetch topic data
  if (topicIds.length) {
    const topicDataRes = await topicRepository.fetchBulkTopicsIDName2({ unit_Topic_id: topicIds });

    chapterDataRes.forEach((val) => {
      if (val.notConsideredTopics) {
        val.notConsideredTopics = val.notConsideredTopics.map((id) => {
          const topic = topicDataRes.find((item) => item.topic_id === id);
          return topic ? topic.topic_title : id;
        });
      }
    });
  }

  return chapterDataRes;
};


exports.postLearningSummaryDetails = async (request) => {
  const studentsDataRes = await studentRepository.getStudentsData2(request);
  const studentsCount = studentsDataRes.Items.length;

  const subjectDataRes = await subjectRepository.getSubjetById2(request);
  if (!subjectDataRes.Items?.length) return;

  const subject_unit_id = subjectDataRes.Items[0].subject_unit_id;
  const unitDataRes = await unitRepository.fetchUnitData2({ subject_unit_id });
  if (!unitDataRes?.length) return;

  const unit_chapter_id = [...new Set(unitDataRes.flatMap(e => e.unit_chapter_id))];
  const chapterDataRes = await chapterRepository.fetchBulkChaptersIDName2({ unit_chapter_id });
  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);

  // Collect topic IDs and map chapters with quiz data
  const topicIds = [];
  quizDataRes.Items.forEach((quiz) => {
    if (quiz.not_considered_topics) {
      topicIds.push(...quiz.not_considered_topics);
    }
    if (quiz.learningType === request.data.type) {
      const chapter = chapterDataRes.find((ch) => ch.chapter_id === quiz.chapter_id);
      if (chapter) {
        chapter.quiz_id = chapter.quiz_id || [];
        chapter.notConsideredTopics = chapter.notConsideredTopics || [];

        chapter.quiz_id.push({
          id: quiz.quiz_id,
          name: quiz.quiz_name,
        });
        chapter.notConsideredTopics.push(...(quiz.not_considered_topics || []));
        chapter.startDate = formatDate(quiz.created_ts);
      }
    }
  });

  // Fetch quiz results
  const quizIds = chapterDataRes.flatMap((val) => val.quiz_id?.map((quiz) => quiz.id) || []);
  const quizResultDataRes = await quizResultRepository.fetchBulkQuizResultsByID2({ unit_Quiz_id: quizIds });

  // Calculate average marks and attendance
  chapterDataRes.forEach((val) => {
    val.totalStrength = studentsCount;

    if (Array.isArray(val.quiz_id)) {
      val.quiz_id.forEach((quiz) => {
        const quizResults = quizResultDataRes.filter((result) => result.quiz_id === quiz.id);
        const totalMarks = quizResults.reduce((sum, result) => sum + (result.marks_details[0]?.totalMark || 0), 0);
        const totalAttendance = quizResults.length;

        quiz.student_attendance = totalAttendance;
        quiz.avgMarks = totalAttendance > 0 ? totalMarks / totalAttendance : 0;
      });
    }
  });

  // Fetch topic data
  if (topicIds.length > 0) {
    const topicDataRes = await topicRepository.fetchBulkTopicsIDName2({ unit_Topic_id: topicIds });

    chapterDataRes.forEach((val) => {
      if (val.notConsideredTopics) {
        val.notConsideredTopics = val.notConsideredTopics.map((id) => {
          const topic = topicDataRes.find((item) => item.topic_id === id);
          return topic ? topic.topic_title : id;
        });
      }
    });
  }

  return chapterDataRes;
};


exports.viewAnalysisIndividualReport = async (request) => {
  const quizData = await quizRepository.fetchQuizDataById2(request);
  const studentsDataRes = await quizResultRepository.fetchQuizResultDataOfStudent2(request);

  if (quizData.Item && studentsDataRes.Items[0]) {
    const setKey = studentsDataRes.Items[0].marks_details[0].set_key;

    const questionTrackDetails = quizData.Item.question_track_details[setKey];
    const questionIds = questionTrackDetails.map(val => val.question_id);
    const topicIds = questionTrackDetails.map(val => val.topic_id);

    const questions = await questionRepository.fetchBulkQuestionsNameById2({ question_id: questionIds });

    const topicNames = await topicRepository.fetchBulkTopicsIDName2({ unit_Topic_id: topicIds });

    const cognitiveSkillNames = await settingsRepository.fetchBulkCognitiveSkillNameById2({
      cognitive_id: questions.map(que => que.cognitive_skill),
    });

    await Promise.all(
      questions.map(async que => {
        const ans = questionTrackDetails.find(val => val.question_id == que.question_id);
        que.topic_title = topicNames.find(val => val.topic_id == ans.topic_id)?.topic_title || "";

        const cognitive_skill = cognitiveSkillNames.find(val => val.cognitive_id == que.cognitive_skill);
        que.cognitive_skill = cognitive_skill?.cognitive_name || "";

        que.obtained_marks = studentsDataRes.Items[0].marks_details[0].qa_details.find(
          val => val.question_id == que.question_id
        )?.obtained_marks;

        await Promise.all(
          que.answers_of_question.map(async ans => {
            if (ans.answer_type === "Image" || ans.answer_type === "Audio File") {
              ans.answer_content = await getS3SignedUrl(ans.answer_content);
            }
          })
        );
      })
    );

    return questions;
  } else {
    return [];
  }
};

exports.viewClassReportQuestions = async (request) => {
  const [quizData, quizResult] = await Promise.all([
    quizRepository.fetchQuizDataById2(request),
    quizResultRepository.fetchQuizResultByQuizId(request)
  ]);
  const quizResultMarksData = quizResult.Items.map(item => item.marks_details[0].qa_details);
  const totalStudents = quizResultMarksData.length;
  const questionMap = {};
  for (const [setName, questions] of Object.entries(quizData.Item.question_track_details)) {
    for (const { question_id } of questions) {
      if (!questionMap[question_id]) {
        questionMap[question_id] = [];
      }
      questionMap[question_id].push(setName);
    }
  }

  const uniqueArray = [...new Set(Object.values(quizData.Item.question_track_details).flat())];//all unique questions
  const uniqueArray1 = [...new Set(Object.keys(questionMap))];//which set the questions belong to
  const questionSet = uniqueArray1.map(questionId => ({
    question_id: questionId,
    sets: questionMap[questionId]
  }));
  const questionIds = uniqueArray.map(item => item.question_id);
  const conceptIds = uniqueArray.map(item => item.concept_id);
  const topicIds = uniqueArray.map(item => item.topic_id);

  //to get question_content and cognitive skillid
  const questions = await new Promise((resolve, reject) => {
    questionRepository.fetchBulkQuestionsNameById({ question_id: questionIds }, (err, res) => {
      if (err) {
        console.log(err);
        return reject(err);
      }
      resolve(res);
    });
  });
  //concept,topic from conceptid,topicid and cognitiveskillid changed to its name and correctansweer
  const cognitive_id = questions.Items.map(que => que.cognitive_skill)
  const conceptNames = conceptIds.length && await conceptRepository.fetchBulkConceptsIDName2({ unit_Concept_id: conceptIds });
  const topicNames = topicIds.length && await topicRepository.fetchBulkTopicsIDName2({ unit_Topic_id: topicIds });
  const cognitiveSkillNames = await new Promise((resolve, reject) => {
    settingsRepository.fetchBulkCognitiveSkillNameById({ cognitive_id: cognitive_id }, (err, res) => {
      if (err) {
        return reject(err);
      }
      resolve(res);
    });
  });
  console.log("sheetal",questions.Items);
  
  questions.Items.map((question, i) => {
    question.questionNo = (i + 1)
    question.set = questionSet.find((q) => q.id == question.id).sets
    const allAnswers = quizResultMarksData.flat().filter(ans => ans.question_id === question.question_id)
    question.cognitive_skill = cognitiveSkillNames.Items.find(e => e.cognitive_id).cognitive_name;
    //% of most common answer for objective (descriptive we wont show anything)
    question.answers_of_question.map((answer, i) => {
      let count = 0;
      allAnswers.map(eachAnswer => {
        if (eachAnswer.question_id == question.question_id) {
          if (eachAnswer.student_answer === answer.answer_content) {
            count++;
          }
        }
      })
      question.answers_of_question[i].mostCommonPercentage = count > 0 ? (count / totalStudents) * 100 : 0
    })

    //% of correct answers
    const correctAnswer = question.answers_of_question.find(answer => answer.answer_display === "Yes")
    question.correctAnswer = correctAnswer ? correctAnswer.answer_content : "N.A"
    if (allAnswers.length === 0) {
      question.correctAnswerPercentage = 0
    } else {
      const correct = allAnswers.reduce((count, answer) => {
        if (
          (String(answer.modified_marks) === 'N.A.' && Number(answer.obtained_marks) === Number(question.marks)) ||
          (String(answer.modified_marks) !== 'N.A.' && Number(answer.modified_marks) === Number(question.marks))
        ) {
          return count + 1;
        }
        return count;
      }, 0);
      question.correctAnswerPercentage = totalStudents > 0 ? (correct / totalStudents) * 100 : 0;
    }
    uniqueArray.map(item => {
      question.concept = conceptNames.find(e => item.concept_id).display_name;
      question.topic = topicNames.find(e => item.topic_id).display_name
    }
    )
  })
  //cognitive table and difficulty table data
  const averageData = questions.Items.map(question => ({
    skill: question.cognitive_skill,
    percentage: question.correctAnswerPercentage,
    level: question.difficulty_level
  }));
  const skillTotals = {};
  const levelTotals = {};

  averageData.forEach(({ skill, percentage, level }) => {
    if (!skillTotals[skill]) {
      skillTotals[skill] = { total: 0, count: 0 };
    }

    skillTotals[skill].total += percentage;
    skillTotals[skill].count += 1;

    if (level !== 'N.A') {
      if (!levelTotals[level]) { levelTotals[level] = { total: 0, count: 0 }; }
      levelTotals[level].total += percentage;
      levelTotals[level].count += 1;
    }
  });

  const cognitiveResult = Object.keys(skillTotals).map(skill => ({
    skill,
    averagePercentage: skillTotals[skill].total / skillTotals[skill].count,
    noOfQuestions: skillTotals[skill].count
  }));

  const difficultyResult = Object.keys(levelTotals).map(level => ({
    level,
    averagePercentage: levelTotals[level].total / levelTotals[level].count,
    noOfQuestions: levelTotals[level].count
  }));
  return { questions: questions.Items, cognitiveSkillAverageData: cognitiveResult, difficultyLevelAverageData: difficultyResult }
}

exports.viewClassReportFocusArea = async (request) => {
  const [quizData, quizResult, schoolDataRes] = await Promise.all([
    quizRepository.fetchQuizDataById2(request),
    quizResultRepository.fetchQuizResultByQuizId(request),
    schoolRepository.getSchoolDetailsById2(request)
  ]);
  //numb of students who attended
  const quizResultMarksData = quizResult.Items.map(item => {
    return {
      marks: item.marks_details[0].qa_details, // Accessing qa_details
      studentId: item.student_id // Accessing student_id
    }
  });
  console.log(quizResultMarksData)
  const totalStudents = quizResultMarksData.length;
  const questionSetA = [...new Set(Object.values(quizData.Item.question_track_details.qp_set_a).flat())];//only set a for focus area
  const conceptAndQuestions = questionSetA.reduce((acc, item) => {
    const existingConcept = acc.find(concept => concept.concept === item.concept_id);
    if (existingConcept) { existingConcept.questions.push(item.question_id); }
    else {
      acc.push({
        concept: item.concept_id,
        questions: [item.question_id]
      });
    }
    return acc;
  }, []);
  const conceptIdsSetA = questionSetA.map(item => item.concept_id);//concepts for set A
  const questionIdsSetA = questionSetA.map(item => item.question_id);//concepts for set A
  console.log({ questionIdsSetA });
  const questions = await new Promise((resolve, reject) => {
    questionRepository.fetchBulkQuestionsNameById({ question_id: questionIdsSetA }, (err, res) => {
      if (err) {
        console.log(err);
        return reject(err);
      }
      resolve(res);
    });
  });
  const totalMarksForAllQuestions = questions.Items.reduce((total, question) => total + question.marks, 0);
  const marksOfEachStudent = [];
  //get student marks based on question 
  quizResultMarksData.map((qdata => {
    qdata.marks.map((marks) => {
      questionIdsSetA.map((question) => {
        if (question === marks.question_id) {
          let marksValue;
          if (marks.modified_marks === 'N.A.') {
            marksValue = marks.obtained_marks === 'N.A.' ? "0" : marks.obtained_marks;
          } else {
            marksValue = marks.modified_marks;
          }

          marksOfEachStudent.push({
            studentid: qdata.studentId,
            marks: marksValue,
            questionId: question
          });

        }
      })
    })

  }))
  const groupedMarks = marksOfEachStudent.reduce((acc, item) => {
    // Find the existing student entry
    const existingStudent = acc.find(student => student.studentid === item.studentid);

    if (existingStudent) {
      // If the student exists, push the new marks and questionId into their array
      existingStudent.details.push({
        marks: item.marks,
        questionId: item.questionId
      });
    } else {
      // If the student doesn't exist, create a new entry
      acc.push({
        studentid: item.studentid,
        details: [{
          marks: item.marks,
          questionId: item.questionId
        }]
      });
    }

    return acc;
  }, []);
  const noOfQuestionsperConcept = conceptIdsSetA.reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc
  }, [])
  console.log({ noOfQuestionsperConcept })
  const conceptNames = conceptIdsSetA.length && await conceptRepository.fetchBulkConceptsIDName2({ unit_Concept_id: conceptIdsSetA });
  let conceptsToFocus = [];
  // let failedStudents = [];
  conceptAndQuestions.map(async (item) => {
    item.numberOfQuestions = noOfQuestionsperConcept[item.concept] || 0;
    item.name = conceptNames.find((c) => c.concept_id == item.concept).display_name;

    //%cal for pass
    let passPercentage = request.config === "post_quiz_config" ? schoolDataRes.Items[0].post_quiz_config.class_percentage : schoolDataRes.Items[0].pre_quiz_config.class_percentage
    let studentsData = []
    item.passPercentage = passPercentage
    console.log({groupedMarks});
    
    groupedMarks.map((student) => {
      let marks = 0;
      console.log(student.details);
      student.details.map((q)=>{
        item.questions.map((question) => {
          if (q.questionId === question) {
            console.log("detailedmarkes",q.marks);
            marks = marks + Number(q.marks)
          }
        })
      })
      
      let finalMarks = (marks / totalMarksForAllQuestions )*100
      console.log({marks},item.questions.length,{finalMarks});

      let passed = (finalMarks >= passPercentage) ? true : false
      studentsData.push({ student: student.studentid, passed: passed })
    })
    // const studentIds = studentsData.filter((student)=>student.passed == false)
    // const failedStudents = studentIds.length && await studentRepository.getStudentsByIdName2({ student_id: studentIds });
    console.log({studentsData});
    const countPassed = studentsData.filter(student => student.passed).length;
    item.passed = countPassed / totalStudents //[%] value
    item.count = countPassed //pass % numerator
    item.totalStudents = totalStudents //pass % denominator
    if (item.passed >= passPercentage) {
      item.successMatrix = "yes";
    } else {
      item.successMatrix = "no";
      conceptsToFocus.push(item.name);
    }

  })
  // console.log({ conceptAndQuestions });
  return { conceptAndQuestions: conceptAndQuestions, conceptsToFocus: conceptsToFocus ,quizData:quizData}
  // return groupedMarks
}

exports.preLearningBlueprintDetails = async (request) => {

  const quizData = await quizRepository.fetchQuizDataById2(request);

  const quizResultData = await quizResultRepository.fetchQuizResultByQuizId(request);

  const aggregatedData = {};

  if (quizData.Item.question_track_details)
    for (const [setKey, questions] of Object.entries(quizData.Item.question_track_details)) {

      questions.forEach((question, index) => {
        if (!aggregatedData[question.question_id]) {
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

        if (!aggregatedData[questionId]) {
          const trackDetails = quizData.Item.question_track_details;

          const topicConceptGroup = trackDetails[
            marksDetails[0].set_key
          ].find((q) => q.question_id === questionId);

          aggregatedData[questionId] = {
            topic_id: topicConceptGroup?.topic_id,
            concept_id: topicConceptGroup?.concept_id,
            total_marks: obtainedMarks,
            count: 1,
          };
        } else {
          aggregatedData[questionId].total_marks += obtainedMarks;
          aggregatedData[questionId].count += 1;
        }
      });
    }
  });

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
    topic_title,
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

  const allStudentsData = await classTestRepository.getStudentInfo(request);

  const quizResultsMap = new Map();
  quizResults.Items.forEach((quizResult) => {
    quizResultsMap.set(quizResult.student_id, quizResult.individual_group_performance);
  });

  allStudentsData.Items.forEach((studentData) => {
    const performance = quizResultsMap.get(studentData.student_id);
    if (performance) {
      studentData.individual_group_performance = performance;
    }
  });

  return allStudentsData;
};

exports.comprehensivePerformanceChapterWise = async (request) => {

  const allStudentsData = await studentRepository.getStudentsData2(request);

  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);

  const allQuestionIds = quizDataRes.Items.flatMap(quiz => [
    ...quiz.question_track_details.qp_set_a.map(q => q.question_id),
    ...quiz.question_track_details.qp_set_b.map(q => q.question_id),
    ...quiz.question_track_details.qp_set_c.map(q => q.question_id)
  ]);

  // Remove duplicates using a Set
  const questions = await questionRepository.fetchBulkQuestionsNameById2({ question_id: [...new Set(allQuestionIds)] });

  const quizIds = quizDataRes.Items.map((val) => val.quiz_id);

  const quizResultDataRes =
    quizIds.length > 0 &&
    (await quizResultRepository.fetchBulkQuizResultsByID2({
      unit_Quiz_id: quizIds,
    }));

  const performance = {};
  const quizResultsByStudent = quizResultDataRes.reduce((acc, result) => {
    if (!acc[result.student_id]) acc[result.student_id] = [];
    acc[result.student_id].push(result);
    return acc;
  }, {});

  const quizDataByQuizId = quizDataRes.Items.reduce((acc, quiz) => {
    acc[quiz.quiz_id] = quiz;
    return acc;
  }, {});

  const chapterIds = new Set();
  allStudentsData.Items.forEach(student => {
    const { student_id, user_firstname, user_lastname } = student;
    const studentResults = quizResultsByStudent[student_id] || [];
    const studentPerformance = {};

    studentResults && studentResults.forEach(result => {
      const { quiz_id, marks_details } = result;
      const quizInfo = quizDataByQuizId[quiz_id];
      const chapterId = quizInfo ? quizInfo.chapter_id : null;

      if (!chapterId) return;

      chapterIds.add(chapterId)
      if (!studentPerformance[chapterId]) {
        studentPerformance[chapterId] = {
          totalQuestions: 0,
          totalMarks: 0,
          obtainedMarks: 0,
        };
      }

      marks_details && marks_details.forEach(markDetail => {
        markDetail.qa_details.forEach(qa => {

          const marksData = questions.find(question => question.question_id == qa.question_id);
          const obtainedMarks = parseFloat(qa.obtained_marks) || 0;
          const modifiedMarks = parseFloat(qa.modified_marks) || 0;

          studentPerformance[chapterId].totalQuestions += 1;
          studentPerformance[chapterId].totalMarks += marksData?.marks;
          studentPerformance[chapterId].obtainedMarks += modifiedMarks ? modifiedMarks : obtainedMarks;

        });
      });
    });


    performance[student_id] = {
      name: `${user_firstname} ${user_lastname}`,
      performance: studentPerformance
    };
  });

  const chapterData = await chapterRepository.fetchBulkChaptersIDName2({ unit_chapter_id: [...chapterIds] });

  Object.values(performance).forEach(student => {
    Object.keys(student.performance).forEach(chapterId => {
      const chapter = chapterData.find(c => c.chapter_id === chapterId);
      if (chapter) {
        student.performance[chapterId].title = chapter.chapter_title;
      }
    });
  });

  return performance;

};

exports.comprehensivePerformanceTopicWise = async (request) => {

  const allStudentsData = await studentRepository.getStudentsData2(request);
  const quizDataRes = await quizRepository.fetchAllQuizBasedonChapter(request);

  const allQuestionIds = quizDataRes.Items.flatMap(quiz => [
    ...quiz.question_track_details.qp_set_a.map(q => q.question_id),
    ...quiz.question_track_details.qp_set_b.map(q => q.question_id),
    ...quiz.question_track_details.qp_set_c.map(q => q.question_id)
  ]);

  const questions = await questionRepository.fetchBulkQuestionsNameById2({ question_id: [...new Set(allQuestionIds)] });


  const quizIds = quizDataRes.Items.map((val) => val.quiz_id);
  const quizResultDataRes =
    quizIds.length > 0 &&
    (await quizResultRepository.fetchBulkQuizResultsByID2({
      unit_Quiz_id: quizIds,
    }));


  const performance = {};

  const quizResultsByStudent = quizResultDataRes.reduce((acc, result) => {
    if (!acc[result.student_id]) acc[result.student_id] = [];
    acc[result.student_id].push(result);
    return acc;
  }, {});


  const quizDataByQuizId = quizDataRes.Items.reduce((acc, quiz) => {
    acc[quiz.quiz_id] = quiz;
    return acc;
  }, {});

  const topicIds = new Set();

  allStudentsData.Items.forEach((student) => {

    const { student_id, user_firstname, user_lastname } = student;
    const studentResults = quizResultsByStudent[student_id] || [];
    const studentPerformance = {};

    studentResults.forEach((result, i) => {
      const { quiz_id, marks_details } = result;
      const quizInfo = quizDataByQuizId[quiz_id];

      if (!quizInfo || !marks_details) return;


      const questionTrackDetails = quizInfo.question_track_details || {};

      marks_details.forEach((markDetail) => {
        const { set_key, qa_details } = markDetail;

        if (!qa_details || !set_key) return;

        const questionsForSet = questionTrackDetails[set_key] || [];

        questionsForSet.forEach((question) => {
          const { topic_id, question_id } = question;
          if (!topic_id) return;

          topicIds.add(topic_id);

          if (!studentPerformance[topic_id]) {
            studentPerformance[topic_id] = {
              totalQuestions: 0,
              totalMarks: 0,
              obtainedMarks: 0,
            };
          }

          qa_details.forEach((qa) => {
            if (qa.question_id === question_id) {

              const marksData = questions.find(question => question.question_id == qa.question_id);
              const obtainedMarks = parseFloat(qa.obtained_marks) || 0;
              const modifiedMarks = parseFloat(qa.modified_marks) || 0;

              studentPerformance[topic_id].totalQuestions += 1;
              studentPerformance[topic_id].totalMarks += marksData?.marks;
              studentPerformance[topic_id].obtainedMarks += modifiedMarks ? modifiedMarks : obtainedMarks;

            }
          });
        });
      });
    });

    performance[student_id] = {
      name: `${user_firstname} ${user_lastname}`,
      performance: studentPerformance,
    };
  });

  const topicData = topicIds.size && await topicRepository.fetchBulkTopicsIDName2({ unit_Topic_id: [...topicIds] });

  Object.values(performance).forEach((student) => {
    Object.keys(student.performance).forEach((topicId) => {
      const topic = topicData.find((t) => t.topic_id === topicId);
      if (topic) {
        student.performance[topicId].title = topic.topic_title;
      }
    });
  });

  return performance;
};

exports.comprehensivePerformanceConceptWise = async (request) => {
  const allStudentsData = await studentRepository.getStudentsData2(request);
  const quizDataRes = await quizRepository.fetchAllQuizBasedonChapter(request);

  const allQuestionIds = quizDataRes.Items.flatMap(quiz => [
    ...quiz.question_track_details.qp_set_a.map(q => q.question_id),
    ...quiz.question_track_details.qp_set_b.map(q => q.question_id),
    ...quiz.question_track_details.qp_set_c.map(q => q.question_id)
  ]);

  const questions = await questionRepository.fetchBulkQuestionsNameById2({ question_id: [...new Set(allQuestionIds)] });

  const quizIds = quizDataRes.Items.map((val) => val.quiz_id);
  const quizResultDataRes =
    quizIds.length > 0 &&
    (await quizResultRepository.fetchBulkQuizResultsByID2({
      unit_Quiz_id: quizIds,
    }));

  const performance = {};

  const quizResultsByStudent = quizResultDataRes.reduce((acc, result) => {
    if (!acc[result.student_id]) acc[result.student_id] = [];
    acc[result.student_id].push(result);
    return acc;
  }, {});

  const quizDataByQuizId = quizDataRes.Items.reduce((acc, quiz) => {
    acc[quiz.quiz_id] = quiz;
    return acc;
  }, {});

  const conceptIds = new Set();

  allStudentsData.Items.forEach((student) => {
    const { student_id, user_firstname, user_lastname } = student;
    const studentResults = quizResultsByStudent[student_id] || [];
    const studentPerformance = {};

    studentResults.forEach((result) => {
      const { quiz_id, marks_details } = result;
      const quizInfo = quizDataByQuizId[quiz_id];

      if (!quizInfo || !marks_details) return;

      const questionTrackDetails = quizInfo.question_track_details || {};

      marks_details.forEach((markDetail) => {
        const { set_key, qa_details } = markDetail;

        if (!qa_details || !set_key) return;

        const questionsForSet = questionTrackDetails[set_key] || [];

        questionsForSet.forEach((question) => {
          const { concept_id, question_id } = question;
          if (!concept_id) return;

          conceptIds.add(concept_id);

          if (!studentPerformance[concept_id]) {
            studentPerformance[concept_id] = {
              totalQuestions: 0,
              totalMarks: 0,
              obtainedMarks: 0,
            };
          }

          qa_details.forEach((qa) => {
            if (qa.question_id === question_id) {

              const marksData = questions.find(question => question.question_id == qa.question_id);

              const obtainedMarks = parseFloat(qa.obtained_marks) || 0;
              const modifiedMarks = parseFloat(qa.modified_marks) || 0;

              studentPerformance[concept_id].totalQuestions += 1;
              studentPerformance[concept_id].totalMarks += marksData?.marks;
              studentPerformance[concept_id].obtainedMarks += modifiedMarks ? modifiedMarks : obtainedMarks;

            }
          });
        });
      });
    });

    performance[student_id] = {
      name: `${user_firstname} ${user_lastname}`,
      performance: studentPerformance,
    };
  });

  const conceptData = conceptIds.size && await conceptRepository.fetchBulkConceptsIDName2({ unit_Concept_id: [...conceptIds] });

  Object.values(performance).forEach((student) => {
    Object.keys(student.performance).forEach((conceptId) => {
      const concept = conceptData.find((c) => c.concept_id === conceptId);
      if (concept) {
        student.performance[conceptId].title = concept.concept_title;
      }
    });
  });

  return performance;
};
