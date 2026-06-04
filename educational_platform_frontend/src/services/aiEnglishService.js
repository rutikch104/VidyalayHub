// @ts-nocheck
import api from './api';
function unwrap(response) {
    const b = response.data;
    if (b && typeof b === 'object' && 'status' in b && b.data !== undefined) {
        return b.data;
    }
    return b;
}
const aiEnglishService = {
    // Get available English courses
    getCourses: async () => {
        const response = await api.get('/ai-english/courses');
        return unwrap(response);
    },
    // Get available English activities
    getActivities: async () => {
        const response = await api.get('/ai-english/activities');
        return unwrap(response);
    },
    // Get user's learning progress
    getLearningProgress: async () => {
        const response = await api.get('/ai-english/progress');
        return unwrap(response);
    },
    // Start a new course
    startCourse: async (courseId) => {
        const response = await api.post('/ai-english/courses/start', { course_id: courseId });
        return unwrap(response);
    },
    // Start a new activity
    startActivity: async (activityId) => {
        const response = await api.post('/ai-english/activities/start', { activity_id: activityId });
        return unwrap(response);
    },
    // Get course content
    getCourseContent: async (courseId) => {
        const response = await api.get(`/ai-english/courses/${courseId}/content`);
        return unwrap(response);
    },
    // Get activity content
    getActivityContent: async (activityId) => {
        const response = await api.get(`/ai-english/activities/${activityId}/content`);
        return unwrap(response);
    },
    // Submit lesson completion
    completeLesson: async (courseId, lessonId, answers) => {
        const response = await api.post(`/ai-english/courses/${courseId}/lessons/${lessonId}/complete`, {
            answers
        });
        return unwrap(response);
    },
    // Submit activity completion
    completeActivity: async (activityId, answers) => {
        const response = await api.post(`/ai-english/activities/${activityId}/complete`, {
            answers
        });
        return unwrap(response);
    },
    // Get pronunciation feedback
    getPronunciationFeedback: async (audioBlob, word) => {
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('word', word);
        const response = await api.post('/ai-english/pronunciation-feedback', formData);
        return unwrap(response);
    },
    // Get vocabulary list
    getVocabularyList: async (category, difficulty) => {
        const params = new URLSearchParams();
        if (category)
            params.append('category', category);
        if (difficulty)
            params.append('difficulty', difficulty);
        const response = await api.get(`/ai-english/vocabulary?${params.toString()}`);
        return unwrap(response);
    },
    // Practice vocabulary
    practiceVocabulary: async (wordIds) => {
        const response = await api.post('/ai-english/vocabulary/practice', { word_ids: wordIds });
        return unwrap(response);
    },
    // Get grammar exercises
    getGrammarExercises: async (topic, difficulty) => {
        const params = new URLSearchParams();
        if (topic)
            params.append('topic', topic);
        if (difficulty)
            params.append('difficulty', difficulty);
        const response = await api.get(`/ai-english/grammar/exercises?${params.toString()}`);
        return unwrap(response);
    },
    // Get writing prompts
    getWritingPrompts: async (type, difficulty) => {
        const params = new URLSearchParams();
        if (type)
            params.append('type', type);
        if (difficulty)
            params.append('difficulty', difficulty);
        const response = await api.get(`/ai-english/writing/prompts?${params.toString()}`);
        return unwrap(response);
    },
    // Submit writing for feedback
    submitWriting: async (promptId, content) => {
        const response = await api.post('/ai-english/writing/submit', {
            prompt_id: promptId,
            content
        });
        return unwrap(response);
    },
    // Get conversation topics
    getConversationTopics: async (level, category) => {
        const params = new URLSearchParams();
        if (level)
            params.append('level', level);
        if (category)
            params.append('category', category);
        const response = await api.get(`/ai-english/conversation/topics?${params.toString()}`);
        return unwrap(response);
    },
    // Start conversation practice
    startConversation: async (topicId) => {
        const response = await api.post('/ai-english/conversation/start', { topic_id: topicId });
        return unwrap(response);
    },
    // Continue conversation
    continueConversation: async (conversationId, userResponse) => {
        const response = await api.post(`/ai-english/conversation/${conversationId}/continue`, {
            user_response: userResponse
        });
        return unwrap(response);
    },
    // Get learning recommendations
    getLearningRecommendations: async () => {
        const response = await api.get('/ai-english/recommendations');
        return unwrap(response);
    },
    // Update learning preferences
    updateLearningPreferences: async (preferences) => {
        const response = await api.put('/ai-english/preferences', preferences);
        return unwrap(response);
    },
    // Get learning preferences
    getLearningPreferences: async () => {
        const response = await api.get('/ai-english/preferences');
        return unwrap(response);
    }
};
export default aiEnglishService;
