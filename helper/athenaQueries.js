exports.getQuizResultsQuery = (quizId) => `
  SELECT 
    CAST(q1.question_track_details AS json) AS question_track_details, 
    CAST(q2.marks_details AS json) AS marks_details 
    FROM dev_upschool_quiz_result q2
    INNER JOIN dev_upschool_quiz_table q1
    ON q1.quiz_id = q2.quiz_id
    WHERE q1.quiz_id = '${quizId}'
`;