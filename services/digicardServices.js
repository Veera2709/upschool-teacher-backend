const {chapterRepository,digicardRepository,digicardExtension,teachingActivityRepository,topicRepository,presetRepository,schoolRepository,commonRepository} = require("../repository")
const commonServices = require("../services/commonServices");
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { TABLE_NAMES } = require('../constants/tables');
const { nextTick } = require("process");
const { response } = require("express");
const { resolve } = require("path");

exports.fetchRelatedDigiCards = async function (request, callback) {
    /** FETCH USER BY EMAIL **/
  let response = { data: [], statusCode: 400 };

    digicardRepository.fetchDigiCardByID(request, async function (single_digicard_err, single_digicard_response) {
        if (single_digicard_err) { 
            response.message = single_digicard_err
            callback(single_digicard_err, single_digicard_response);
        } else {
            console.log("single_digicard_response : ", single_digicard_response); 

            if (single_digicard_response.Items.length > 0) {
                let related_digi_cards = single_digicard_response.Items[0].related_digi_cards;

                digicardRepository.fetchRelatedDigiCardData({related_digi_cards: related_digi_cards}, async function (related_digicard_err, related_digicard_response) {
                    if (related_digicard_err) {
                        response.message = related_digicard_err
                        callback(related_digicard_err, related_digicard_response);
                    } else {
                        response.data = related_digicard_response.Items; 
                        response.message = constant.messages.RELATED_DIGICARDS; 
                        response.statusCode = 200; 
                        callback(0, response); 
                    }
                })
             
            } else {
                callback(401, constant.messages.INVALID_DIGICARD);
            }
        }
    })
}

exports.fetchIndividualDigiCard = async function (request, callback) {
    /** FETCH USER BY EMAIL **/
    digicardRepository.fetchDigiCardByID(request, async function (single_digicard_err, single_digicard_response) {
        if (single_digicard_err) {
            console.log(single_digicard_err);
            callback(single_digicard_err, single_digicard_response);
        } else {
            if (single_digicard_response.Items.length > 0) {

                let digiContent = (single_digicard_response.Items[0].digi_card_content === undefined) ? "" : single_digicard_response.Items[0].digi_card_content;

                console.log("DIGI CONTENT : ", digiContent);
                /** SET PRESETS **/
                presetRepository.getAllPresets(request, async function (presetData_err, presetData_res) {
                    if (presetData_err) {
                        console.log(presetData_err);
                        callback(presetData_err, presetData_res);
                    } else {

                        console.log("PRESET DATA : ", presetData_res);

                        let openTag = "";
                        let closeTag = "</p></div>";
                        let replaceCondition;
                        async function checkAndSetPreset(k)
                        {
                            if(k < presetData_res.Items.length)
                            {
                                if(digiContent.includes(presetData_res.Items[k].preset_markup))
                                {
                                    openTag = "<div style = '";
                                    openTag += presetData_res.Items[k].preset_bg_style +"'><span style='" + presetData_res.Items[k].preset_heading_style + "'>" + presetData_res.Items[k].preset_heading + "</span><br><p style='" + presetData_res.Items[k].preset_content_style + "'>";

                                    replaceCondition = new RegExp(`${presetData_res.Items[k].preset_markup}(.*?)${presetData_res.Items[k].preset_markup}`, "g");

                                    digiContent = digiContent.replace(replaceCondition, openTag+"$1"+closeTag);
                                }

                                k++;
                                checkAndSetPreset(k);
                            }
                            else
                            {
                                /** END PRESET LOOP **/
                                console.log("PREVIEW DIGICARD : ", digiContent);
                                single_digicard_response.Items[0].preview_content = digiContent;

                                if (single_digicard_response.Items[0].digicard_image && single_digicard_response.Items[0].digicard_image !== "" && single_digicard_response.Items[0].digicard_image !== "N.A." && single_digicard_response.Items[0].digicard_image.includes("uploads/")) 
                                {
                                    single_digicard_response.Items[0].digicard_imageURL = await helper.getS3SignedUrl(single_digicard_response.Items[0].digicard_image);
                                }
                                if (single_digicard_response.Items[0].digicard_voice_note && single_digicard_response.Items[0].digicard_voice_note !== "" && single_digicard_response.Items[0].digicard_voice_note !== "N.A." && single_digicard_response.Items[0].digicard_voice_note.includes("uploads/")) 
                                {
                                    single_digicard_response.Items[0].digicard_voice_noteURL = await helper.getS3SignedUrl(single_digicard_response.Items[0].digicard_voice_note);
                                }
                                if (single_digicard_response.Items[0].digicard_document && single_digicard_response.Items[0].digicard_document !== "" && single_digicard_response.Items[0].digicard_document !== "N.A." && single_digicard_response.Items[0].digicard_document.includes("uploads/")) 
                                {
                                    single_digicard_response.Items[0].digicard_documentURL = await helper.getS3SignedUrl(single_digicard_response.Items[0].digicard_document);
                                }

                                /** END PRESET LOOP **/
                                   // Voice Inputs into Icon as Play 
                                let digi_card_content = `<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css">` + single_digicard_response.Items[0].preview_content;

                                const toReplace = /##audio##(.*?)##audio##/
                                let j = 0; 
                                if(digi_card_content != undefined && digi_card_content != ""){
                                    let spliArray = digi_card_content.split("##audio##"); 
                                    console.log("spliArray : ", spliArray);
                                    
                                    spliArray.forEach((e, i) => {
                                        console.log("e : ", JSON.stringify(e), JSON.stringify(e).includes("http") && e[0] === "h");
                                        if(JSON.stringify(e).includes("http") && e[0] === "h"){
                                            
                                            digi_card_content = digi_card_content.replace(toReplace, '<i id="itag'+ j +'" class="fa fa-volume-up" onclick="document.getElementById('+"\'audio"+""+j+'\').play()" alt="Play"><audio id="audio'+ j +'" src="$1"></audio></i>');
                                            j++;
                                        }
                                    })
                                }
                                
                                single_digicard_response.Items[0].preview_content = digi_card_content;
                                callback(0, single_digicard_response);
                                
                            }
                        }
                        checkAndSetPreset(0)
                    }
                })
                /** END SET PRESETS **/              
            } else {
                callback(0, single_digicard_response);
            }
        }
    })
}

exports.fetchAllPreTopicsAndItsDigicards = async function (request, callback) { 
    schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
        if(schoolDataErr)
        {
            console.log(schoolDataErr);
            callback(schoolDataErr, schoolDataRes);
        }
        else
        { 
            if(schoolDataRes.Items[0].pre_quiz_config)
            {
                teachingActivityRepository.fetchTeachingActivity(request, async function (teachActivity_err, teachActivity_response) {
                    if (teachActivity_err) { 
                        console.log(teachActivity_err);
                        callback(teachActivity_err, teachActivity_response);
                    } else {
                        console.log("TEACHER ACTIVITY : ", teachActivity_response);
                        let chapterActivity = teachActivity_response.Items.length > 0 ? teachActivity_response.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id) : [];
                        
                        let archivedTopics = chapterActivity.length > 0 && chapterActivity[0].pre_learning.archivedTopics ? chapterActivity[0].pre_learning.archivedTopics : [];
            
                        let isUnlocked = ( chapterActivity.length > 0 && chapterActivity[0].pre_learning.unlocked_digicard.topics ) ? chapterActivity[0].pre_learning.unlocked_digicard.topics : [];
            
                        if(isUnlocked.length > 0)
                        {
                            console.log(constant.messages.DIGICARD_UNLOCKED_ALREADY);
                            callback(400, constant.messages.DIGICARD_UNLOCKED_ALREADY);
                        }
                        else
                        {
                            /** FETCH CHAPTER DATA **/
                            chapterRepository.fetchChapterByID(request, async function (chapterData_err, chapterData_response) {
                                if (chapterData_err) {
                                    console.log(chapterData_err);
                                    callback(chapterData_err, chapterData_response);
                                } else {
                                    console.log("CHAPTER DATA : ", chapterData_response);
                                    let preLearningTopicIds = chapterData_response.Items.length > 0 ? chapterData_response.Items[0].prelearning_topic_id : [];
            
                                    let AcitveTopics = await helper.getDifferenceValueFromTwoArray(preLearningTopicIds, archivedTopics);
            
                                    if(AcitveTopics.length > 0)
                                    {
                                        /** FETCH TOPICS DATA **/
                                        let fetchBulkTopicReq = {
                                            IdArray : AcitveTopics,
                                            fetchIdName : "topic_id",
                                            TableName : TABLE_NAMES.upschool_topic_table
                                        }
                                        
                                        commonRepository.fetchBulkData(fetchBulkTopicReq, async function (topicData_err, topicData_res) {
                                            if (topicData_err) {
                                                console.log(topicData_err);
                                                callback(topicData_err, topicData_res);
                                            } else {
                                                console.log("TOPIC DATA");
                                                console.log(topicData_res.Items);
            
                                                /** CREATE RESPONSE **/
                                                exports.getPrePostTopicsAndItsDigicards(topicData_res, (createdErr, createdRes) => {
                                                    if(createdErr)
                                                    {
                                                        console.log(createdErr);
                                                        callback(createdErr, createdRes);
                                                    }
                                                    else
                                                    {
                                                        console.log("GOT PRE TOPIC AND ITS DIGICARDS!");
                                                        callback(createdErr, createdRes);
                                                    }
                                                })                                            
                                                /** END CREATE RESPONSE **/
                                            }
                                        })
                                        /** END FETCH TOPICS DATA **/
                                    }
                                    else
                                    {
                                        console.log(constant.messages.NO_ACTIVE_TOPICS);
                                        callback(400, constant.messages.NO_ACTIVE_TOPICS);
                                    }                    
                                }
                            })
                            /** END FETCH CHAPTER DATA **/
                        }            
                    }
                })
            }
            else
            {
                console.log(constant.messages.SCHOOL_DOESNT_HAVE_PREQUIZ_CONFIG);
                callback(400, constant.messages.SCHOOL_DOESNT_HAVE_PREQUIZ_CONFIG);
            }
        }
    })    
}

exports.createTopicsAndItsCardsList = async (topicList, conceptList, DigicardList, callback) => {
    let conceptIds = [];
    let digiCardIds = [];
    let digicardDetails = [];
    let finalTopicAndCards = [];

    async function setTopicAndCard(i)
    {
        if(i < topicList.length)
        {
            console.log("loop : ", i);
            conceptIds = [];
            digiCardIds = []; 
            digicardDetails = [];

            conceptIds = topicList[i].topic_concept_id;
                
            await conceptIds.map(async conId => {
                await conceptList.map(cBlock => {
                    if(cBlock.concept_id === conId)
                    {
                        digiCardIds = digiCardIds.concat(cBlock.concept_digicard_id);
                    }
                })
            }) 

            digiCardIds = helper.removeDuplicates(digiCardIds);        

            await digiCardIds.map(async dId => {
                await DigicardList.map(dList => {
                    if(dList.digi_card_id === dId)
                    {
                        digicardDetails.push({
                            digicard_id : dList.digi_card_id,
                            digicard_name : dList.display_name ? dList.display_name : dList.digi_card_title

                        })
                    }
                })
            })

            /** SET FINAL TOPIC DETAILS **/

            finalTopicAndCards.push(
                {
                    topic_id : topicList[i].topic_id,
                    topic_name : topicList[i].display_name,
                    digicard_list :digicardDetails
                }
            )
            
            i++;
            setTopicAndCard(i);
        }
        else
        {
            callback(0, finalTopicAndCards);
        }
    }
    setTopicAndCard(0)    
}

exports.changeDigicardLockStatus = function (request, callback) {

    if(request === undefined || request.data === undefined || request.data.client_class_id === undefined || request.data.client_class_id === "" || request.data.section_id === undefined || request.data.section_id === "" || request.data.subject_id === undefined || request.data.subject_id === "" || request.data.chapter_id === undefined || request.data.chapter_id === "" || request.data.digicard_stage === undefined || request.data.digicard_stage === "" || request.data.topics === undefined || request.data.digicard_stage === "" || request.data.due_date === undefined || request.data.due_date === ""){
        callback(400, constant.messages.INVALID_REQUEST_FORMAT)
    }else{
        if( request.data.digicard_stage === "Pre" || request.data.digicard_stage === "Post"){
            // Fetch Teacher Activity with the Combinations : 
            teachingActivityRepository.fetchTeachingActivity(request, async function (teacher_activity_details_err, teacher_activity_details_res) {
                if (teacher_activity_details_err) { 
                console.log(teacher_activity_details_err);
                callback(teacher_activity_details_err, teacher_activity_details_res);
                } else {
                    // Initiate Default Chapter Data for Pre and Post : 
                    let individual_chapter_data;
        
                    if(request.data.digicard_stage === "Pre"){
                        individual_chapter_data = [{}];
                        individual_chapter_data[0].chapter_id = request.data.chapter_id;
                        individual_chapter_data[0].chapter_locked = "No";
                        individual_chapter_data[0].pre_learning = {};
                        individual_chapter_data[0].post_learning = {};
                        individual_chapter_data[0].pre_learning.archivedTopics = [];
                        individual_chapter_data[0].post_learning.archivedTopics = [];
                        individual_chapter_data[0].pre_learning.unlocked_digicard = {};
                        individual_chapter_data[0].post_learning.unlocked_digicard = [];
                        individual_chapter_data[0].pre_learning.unlocked_digicard.topics = request.data.topics;
                        individual_chapter_data[0].pre_learning.unlocked_digicard.due_date = {};
                        individual_chapter_data[0].pre_learning.unlocked_digicard.due_date.yyyy_mm_dd = request.data.due_date;
                        individual_chapter_data[0].pre_learning.unlocked_digicard.due_date.dd_mm_yyyy = helper.change_dd_mm_yyyy(request.data.due_date);
        
                    } else if (request.data.digicard_stage === "Post"){
                        individual_chapter_data = [{}];
                        individual_chapter_data[0].chapter_id = request.data.chapter_id;
                        individual_chapter_data[0].chapter_locked = "No";
                        individual_chapter_data[0].pre_learning = {};
                        individual_chapter_data[0].post_learning = {};
                        individual_chapter_data[0].post_learning.archivedTopics = [];
                        individual_chapter_data[0].pre_learning.unlocked_digicard = {};
                        individual_chapter_data[0].pre_learning.archivedTopics = [];
                        individual_chapter_data[0].post_learning.unlocked_digicard = [{}];
                        individual_chapter_data[0].post_learning.unlocked_digicard[0].topics = request.data.topics;
                        individual_chapter_data[0].post_learning.unlocked_digicard[0].due_date = {};
                        individual_chapter_data[0].post_learning.unlocked_digicard[0].due_date.yyyy_mm_dd = request.data.due_date;
                        individual_chapter_data[0].post_learning.unlocked_digicard[0].due_date.dd_mm_yyyy = helper.change_dd_mm_yyyy(request.data.due_date);
                        console.log("Before individual_chapter_data : ", individual_chapter_data);
                        
                    }
                    // Check if we have data in Teacher Activity or not : 
                    if(teacher_activity_details_res.Items.length > 0){
                        let all_chapter_data = teacher_activity_details_res.Items[0].chapter_data; 
                        // Get Required Chapter Data : 
                        let chapter_data = all_chapter_data.filter(e => e.chapter_id === request.data.chapter_id); 
            
                        let myPromise = new Promise( async function(myResolve, myReject) {
                            // Check if we have Data on required Chapter : 
                            if(teacher_activity_details_res.Items.length > 0 && chapter_data.length > 0){
                                // Update Pre Chapter and Digicard Unlock Data : 
                                if(request.data.digicard_stage === "Pre"){ 

                                    if((chapter_data[0].pre_learning.unlocked_digicard !== undefined && chapter_data[0].pre_learning.unlocked_digicard.topics !== undefined)){
                                        myResolve(400);
                                    }else{
                                        individual_chapter_data[0].pre_learning.archivedTopics = chapter_data[0].pre_learning.archivedTopics; 
                                        individual_chapter_data[0].post_learning = chapter_data[0].post_learning; 

                                        all_chapter_data.forEach((e,i) =>  e.chapter_id === request.data.chapter_id && (all_chapter_data[i] = individual_chapter_data[0])); 
                                        myResolve(200);
                                    }
        
                                }else if(request.data.digicard_stage === "Post"){
            
                                    chapter_data[0].chapter_locked = "No"; 
                                    // Check if topics are unlocked : 
                                    if(chapter_data[0].post_learning.unlocked_digicard !== undefined && chapter_data[0].post_learning.unlocked_digicard.length > 0){
                                        
                                        let topics = []; 
                                        let topic_array = []; 
        
                                        chapter_data[0].post_learning.unlocked_digicard.map((e) => topics.push(...e.topics)) 
                                        console.log("topics : ", topics);
                                        
                                        topics.forEach((e) => ( request.data.topics.filter(a => a.topic_id === e.topic_id).length ) > 0 && topic_array.push(e.topic_id) )
                                        console.log("topic_array : ", topic_array); 
                                        // Check if some of the topics out of selected are already unlocked , if yes, throw error that they are already unlocked : 
                                        if(topic_array.length > 0){
                                            // Run Query to fetch Topic Names and and Throw Error that these topics already unlocked : 
                                            topicRepository.fetchPostTopicData({postlearning_topic_id: topic_array}, async function (post_topic_err, post_topic_response) {
                                                if (post_topic_err) {
                                                    console.log(post_topic_err);
                                                    callback(post_topic_err, post_topic_response);
                                                } else {
                                                    console.log("post_topic_response : ", post_topic_response);
        
                                                    let topic_names = ""; 
                                                    post_topic_response.Items.map((e, i) => {
                                                        ( i === post_topic_response.Items.length-1 ) ? ( topic_names += e.topic_title ) : ( topic_names += e.topic_title + "," ) 
                                                    }); 
                                                    console.log("topic_names : ", topic_names);
                                                    // Throw Topic Names to Promise 
                                                    myResolve(topic_names); 
                                                }
                                            }); 
                                        }else{
                                            // Unlock selected Topic Digicards / Append request data to Unlock Digicard : 
                                            chapter_data[0].post_learning.unlocked_digicard.push({
                                                                                                    topics: request.data.topics,
                                                                                                    due_date: request.data.due_date
                                                                                                }) 
                                            all_chapter_data.filter((e) => {e.chapter_id === request.data.chapter_id && (e = chapter_data[0])}); 
                                            myResolve(200); 
                                        }
        
                                    }else{
                                        // If No Post Topic is previously Unlocked : 
                                        individual_chapter_data[0].post_learning.unlocked_digicard[0].topics = request.data.topics; 
                                        individual_chapter_data[0].post_learning.unlocked_digicard[0].due_date.yyyy_mm_dd = request.data.due_date; 
                                        individual_chapter_data[0].post_learning.unlocked_digicard[0].due_date.dd_mm_yyyy = helper.change_dd_mm_yyyy(request.data.due_date); 
                                        individual_chapter_data[0].pre_learning = chapter_data[0].pre_learning; 
                                        individual_chapter_data[0].post_learning.archivedTopics = chapter_data[0].post_learning.archivedTopics; 
                                        
                                        await all_chapter_data.forEach((e, i) => e.chapter_id === request.data.chapter_id && ( all_chapter_data[i] = individual_chapter_data[0] ))
                                        myResolve(200); 
                                    } 
                                }
                            }else{
                                // No Chapter Data : 
                                all_chapter_data.push(individual_chapter_data[0]); 
                                myResolve(200);
                            }
                        });
            
                        myPromise.then(
                        (value) => {
                            // Success Condition : 
                            if(value === 200){ 
                                request.data.activity_id = teacher_activity_details_res.Items[0].activity_id;
                                // request.data.teacher_id = request.data.teacher_id;
                                request.data.chapter_data = all_chapter_data;
                
                                teachingActivityRepository.updateTeachingActivity(request, function (update_chapter_data_err, update_chapter_data_response) {
                                    if (update_chapter_data_err) {
                                        console.log(update_chapter_data_err);
                                        callback(update_chapter_data_err, update_chapter_data_response);
                                    } else {
                                        request.data.digicard_stage === "Pre" ? callback(200, constant.messages.PRE_DIGICARDS_UNLOCKED) : callback(200, constant.messages.POST_DIGICARDS_UNLOCKED); 
                                    }
                                })
                            }else if(value === 400){
                                callback(400, constant.messages.DIGICARD_UNLOCKED_ALREADY) 
                                
                            }else{
                                // If already unlocked Topics are selected : 
                                callback(400, constant.messages.UNABLE_TO_UNLOCK_DIGICARDS.replace("**REPLACE**", value)) 
                            }
                        },
                        (error) => {
                            console.log("error : ", error);
                            callback(400, constant.messages.ERROR)
                        });
                    }else{ 
                        // Add New Teacher Actvity : 
                        // request.data.teacher_id = request.data.teacher_id;
                        request.data.chapter_data = individual_chapter_data;
        
                        teachingActivityRepository.addTeachingActivity(request, function (insert_activity_err, insert_activity_response) {
                            if (insert_activity_err) {
                                console.log(insert_activity_err);
                                callback(insert_activity_err, insert_activity_response);
                            } else {
                                insert_activity_response === 200 
                                ? 
                                request.data.digicard_stage === "Pre" ? callback(200, constant.messages.PRE_DIGICARDS_UNLOCKED) : callback(200, constant.messages.POST_DIGICARDS_UNLOCKED) 
                                :
                                callback(400, constant.messages.TEACHER_ACTIVITY_ERROR)
                            }
                        })
                    }
                }
            }) 
            }else{
                callback(400, constant.messages.INVALID_REQUEST_FORMAT)
            }
    }
}

exports.fetchAllPostTopicsAndItsDigicards = function (request, callback) {
    schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
        if(schoolDataErr)
        {
            console.log(schoolDataErr);
            callback(schoolDataErr, schoolDataRes);
        }
        else
        { 
            // console.log(schoolDataRes);
            if(schoolDataRes.Items[0].post_quiz_config)
            {
                teachingActivityRepository.fetchTeachingActivity(request, async function (activityTeach_err, activityTeach_res) {
                    if (activityTeach_err) { 
                    console.log(activityTeach_err);
                    callback(activityTeach_err, activityTeach_res);
                    } else {
                        // console.log("TEACHER ACTIVITY : ", activityTeach_res);
                        let chapterActivity = activityTeach_res.Items.length > 0 ? activityTeach_res.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id) : [];
                        let archivedTopics = chapterActivity.length > 0 ? chapterActivity[0].post_learning.archivedTopics : [];
                        let unlockedDetails = ( chapterActivity.length > 0 && chapterActivity[0].post_learning.unlocked_digicard ) ? chapterActivity[0].post_learning.unlocked_digicard : [];
                        
                        console.log("archivedTopics : ", archivedTopics);
                        console.log("request.data.topicList : ", request.data.topicList);
                        
                        let AcitveTopics = await helper.getDifferenceValueFromTwoArray(request.data.topicList, archivedTopics);

                        /** HERE **/
                        if(request.data.topicList.length > 0)
                        {
                            /** MULTI UNLOCK PART **/
                            if(schoolDataRes.Items[0].post_quiz_config.choose_topic === "Yes")
                            {
                                /** CHOOSEN TOPICS PART **/
                                if(AcitveTopics.length > 0)
                                {
                                    console.log("UNLOCKED DETAILS : ", unlockedDetails);

                                    let unlockedTopicCards = [];
                                    await unlockedDetails.map(async unDetails => {
                                        console.log("UNLOCKED TOPICS : ", unDetails.topics);
                                        await unDetails.topics.map(topDigi => {
                                            if(AcitveTopics.includes(topDigi.topic_id))
                                            {
                                                unlockedTopicCards.push(topDigi.topic_id);
                                            }
                                        })
                                    });                            
                                    
                                    let toFetchTopicsIds = unlockedTopicCards.length > 0 ? unlockedTopicCards : AcitveTopics;

                                    /** FETCH TOPICS DATA **/
                                    let fetchBulkTopicReq = {
                                        IdArray : toFetchTopicsIds,
                                        fetchIdName : "topic_id",
                                        TableName : TABLE_NAMES.upschool_topic_table
                                    }
                                    
                                    commonRepository.fetchBulkData(fetchBulkTopicReq, async function (topicData_err, topicData_res) {
                                        if (topicData_err) {
                                            console.log(topicData_err);
                                            callback(topicData_err, topicData_res);
                                        } else {
                                            console.log("TOPIC DATA");
                                            console.log(topicData_res.Items);

                                            if(unlockedTopicCards.length > 0)
                                            {
                                                let unlockedTopicNames = "";
                                                await topicData_res.Items.map(errTop => {
                                                    unlockedTopicNames += errTop.display_name ? ", " + errTop.display_name : ", " + errTop.topic_title;
                                                })

                                                console.log(unlockedTopicNames);
                                                console.log(constant.messages.TOPICS_ALREADY_UNLOCKED.replace("**REPLACE**", unlockedTopicNames.slice(2)));
                                                callback(400, constant.messages.TOPICS_ALREADY_UNLOCKED.replace("**REPLACE**", unlockedTopicNames.slice(2)));
                                            }
                                            else
                                            {
                                                /** CREATE RESPONSE **/
                                                exports.getPrePostTopicsAndItsDigicards(topicData_res, (createdErr, createdRes) => {
                                                    if(createdErr)
                                                    {
                                                        console.log(createdErr);
                                                        callback(createdErr, createdRes);
                                                    }
                                                    else
                                                    {
                                                        console.log("GOT POST TOPIC AND ITS DIGICARDS!");
                                                        callback(createdErr, createdRes);
                                                    }
                                                })                                            
                                                /** END CREATE RESPONSE **/
                                            }
                                        }
                                    })
                                    /** END FETCH TOPICS DATA **/
                                }
                                else
                                {
                                    console.log(constant.messages.NO_ACTIVE_TOPICS);
                                    callback(400, constant.messages.NO_ACTIVE_TOPICS);
                                }
                                /** END CHOOSEN TOPICS PART **/
                            }
                            else
                            {
                                /** MISS CONFIGURATION **/
                                console.log("post_quiz_config.choose_topic : ", schoolDataRes.Items[0].post_quiz_config.choose_topic)
                                console.log(constant.messages.PERMISSION_DENIED);
                                callback(400, constant.messages.PERMISSION_DENIED)
                                /** END MISS CONFIGURATION **/
                            }
                            /** END MULTI UNLOCK PART **/
                        }
                        else
                        {
                            /** SINGLE UNLOCK PART **/
                            if(schoolDataRes.Items[0].post_quiz_config.choose_topic === "No")
                            {
                                if(unlockedDetails.length > 0)
                                {
                                    console.log(constant.messages.DIGICARD_UNLOCKED_ALREADY);
                                    callback(400, constant.messages.DIGICARD_UNLOCKED_ALREADY);
                                }
                                else
                                {
                                    /** FETCH CHAPTER DATA **/
                                    chapterRepository.fetchChapterByID(request, async function (chapterData_err, chapterData_response) {
                                        if (chapterData_err) {
                                            console.log(chapterData_err);
                                            callback(chapterData_err, chapterData_response);
                                        } else {
                                            console.log("CHAPTER DATA : ", chapterData_response);
                                            let postLearningTopicIds = chapterData_response.Items.length > 0 ? chapterData_response.Items[0].postlearning_topic_id : [];

                                            let topicsActive = await helper.getDifferenceValueFromTwoArray(postLearningTopicIds, archivedTopics);

                                            if(topicsActive.length > 0)
                                            {
                                                /** FETCH POST TOPICS DATA **/
                                                let fetchBulkTopicReq = {
                                                    IdArray : topicsActive,
                                                    fetchIdName : "topic_id",
                                                    TableName : TABLE_NAMES.upschool_topic_table
                                                }
                                                
                                                commonRepository.fetchBulkData(fetchBulkTopicReq, async function (topicData_err, topicData_res) {
                                                    if (topicData_err) {
                                                        console.log(topicData_err);
                                                        callback(topicData_err, topicData_res);
                                                    } else {
                                                        console.log("TOPIC DATA");
                                                        console.log(topicData_res.Items);

                                                        /** CREATE RESPONSE **/
                                                        exports.getPrePostTopicsAndItsDigicards(topicData_res, (createdErr, createdRes) => {
                                                            if(createdErr)
                                                            {
                                                                console.log(createdErr);
                                                                callback(createdErr, createdRes);
                                                            }
                                                            else
                                                            {
                                                                console.log("GOT PRE TOPIC AND ITS DIGICARDS!");
                                                                callback(createdErr, createdRes);
                                                            }
                                                        })                                            
                                                        /** END CREATE RESPONSE **/
                                                    }
                                                })
                                                /** END POST FETCH TOPICS DATA **/
                                            }
                                            else
                                            {
                                                console.log(constant.messages.NO_ACTIVE_TOPICS);
                                                callback(400, constant.messages.NO_ACTIVE_TOPICS);
                                            }                    
                                        }
                                    })
                                    /** END FETCH CHAPTER DATA **/
                                }
                            }
                            else
                            {
                                /** NO TOPICS SELECTED **/
                                console.log(constant.messages.NO_TOPIC_IS_SELECTED);
                                callback(400, constant.messages.NO_TOPIC_IS_SELECTED);
                                /** NO TOPICS SELECTED **/
                            }
                            /** END SINGLE UNLOCK PART **/
                        }
                        /** END HERE **/                       
                    }
                })     
            }
            else
            {
                console.log(constant.messages.SCHOOL_DOESNT_HAVE_POSTQUIZ_CONFIG);
                callback(400, constant.messages.SCHOOL_DOESNT_HAVE_POSTQUIZ_CONFIG);
            }    
        }
    })    
}

exports.getPrePostTopicsAndItsDigicards = async function (topicData_res, callback) {
    let topicConceptsIds = [];
    await topicData_res.Items.map(topData => {
        topicConceptsIds = topicConceptsIds.concat(topData.topic_concept_id);
    })

    topicConceptsIds = [...new Set(topicConceptsIds)];
    console.log({topicConceptsIds});

    /** FETCH CONCEPT DATA **/
    let fetchBulkConceptReq = {
        IdArray : topicConceptsIds,
        fetchIdName : "concept_id",
        TableName : TABLE_NAMES.upschool_concept_blocks_table
    }

    commonRepository.fetchBulkData(fetchBulkConceptReq, async function (conceptData_err, conceptData_res) {
        if (conceptData_err) {
            console.log(conceptData_err);
            callback(conceptData_err, conceptData_res);
        } else {
            console.log("CONCEPT BLOCK DATA");
            console.log(conceptData_res.Items);

            let digicardsIds = [];
            await conceptData_res.Items.map(conData => {
                digicardsIds = digicardsIds.concat(conData.concept_digicard_id);
            })

            digicardsIds = [...new Set(digicardsIds)];
            console.log({digicardsIds});

            /** FETCH DIGICARD DATA **/
            let fetchBulkDigiReq = {
                IdArray : digicardsIds,
                fetchIdName : "digi_card_id",
                TableName : TABLE_NAMES.upschool_digi_card_table,
                projectionExp : ["digi_card_id", "digi_card_title", "display_name"]
            }
            
            commonRepository.fetchBulkDataWithProjection(fetchBulkDigiReq, async function (digiData_err, digiData_res) {
                if (digiData_err) {
                    console.log(digiData_err);
                    callback(digiData_err, digiData_res);
                } else {
                    console.log("DIGICARD DATA");
                    console.log(digiData_res.Items);
                    
                    /** CREATE TOPIC AND ITS CARDS LIST **/
                    exports.createTopicsAndItsCardsList(topicData_res.Items, conceptData_res.Items, digiData_res.Items, (topicAndCard_err, topicAndCard_data) => {
                        if(topicAndCard_err)
                        {
                            console.log(topicAndCard_err);
                            callback(topicAndCard_err, topicAndCard_data);
                        }
                        else
                        {
                            console.log("CREATED TOPIC AND DIGICARD LIST");
                            console.log(topicAndCard_data);
                            callback(topicAndCard_err, topicAndCard_data);
                        }
                    })
                }
            })
            /** END FETCH DIGICARD DATA **/
        }
    })
    /** END FETCH CONCEPT DATA **/
}

exports.getExtensionOfDigicard = async function (request, callback) {
    /** FETCH EXTENSION **/
    digicardExtension.getExtensionDetails(request, async function (digiExtension_err, digiExtension_response) {
        if (digiExtension_err) {
            console.log(digiExtension_err);
            callback(digiExtension_err, digiExtension_response);
        } else {
            console.log("DIGI EXTENSION : ", digiExtension_response);
            if(digiExtension_response.Items.length > 0)
            {
                async function getExtFileS3Url(i)
                {
                    if(i < digiExtension_response.Items[0].extensions.length)
                    {
                        let ExtContent = digiExtension_response.Items[0].extensions[i].ext_file;
                        digiExtension_response.Items[0].extensions[i].ext_file_url = (JSON.stringify(ExtContent).includes("digicard_extension/")) ? await helper.getS3SignedUrl(ExtContent) : "N.A.";
                        i++;
                        getExtFileS3Url(i);
                    }
                    else
                    {
                        console.log("DIGICARD DATA : ", digiExtension_response);
                        callback(digiExtension_err, digiExtension_response);
                    }
                }
                getExtFileS3Url(0);
            }   
            else
            {
                console.log("EMPTY EXTENSION!");
                callback(digiExtension_err, digiExtension_response);
            }
        }
    })
    /** END FETCH EXTENSION **/
}