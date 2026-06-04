const { loadDemoEntries, findBestDemoAnswer } = require('../helpers/hrAdminDemoMatch');
const { openAiChatFallback } = require('../helpers/openAiChatFallback');

/**
 * POST /api/ai-english/conversation/:conversationId/continue
 * Body: { user_response }
 */
exports.continueConversation = async (req, res) => {
  try {
    const userResponse = String(req.body?.user_response ?? '').trim();
    if (!userResponse) {
      return res.status(400).json({ status: false, message: 'user_response is required.' });
    }

    const entries = loadDemoEntries();
    const match = findBestDemoAnswer(userResponse, entries);

    if (match) {
      return res.status(200).json({
        status: true,
        data: {
          ai_response: match.answer,
          feedback: '',
          conversation_complete: false,
        },
      });
    }

    const aiText = await openAiChatFallback(userResponse);
    return res.status(200).json({
      status: true,
      data: {
        ai_response: aiText,
        feedback: '',
        conversation_complete: false,
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('continueConversation', e);
    return res.status(500).json({ status: false, message: 'Could not process your message.' });
  }
};
