import { GoogleGenAI } from "@google/genai";
import { User, Club } from "../types";

// Khởi tạo client Gemini
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const getClubRecommendations = async (userProfile: User, clubsList: Club[]) => {
  const prompt = `
Tôi là một sinh viên với hồ sơ như sau:
- Chuyên ngành: ${userProfile.major || 'Chưa cập nhật'}
- Sở thích: ${userProfile.interests || 'Chưa cập nhật'}
- Kỹ năng: ${userProfile.skills || 'Chưa cập nhật'}
- Giới thiệu bản thân: ${userProfile.bio || 'Chưa cập nhật'}

Dưới đây là danh sách các câu lạc bộ hiện có tại trường:
${JSON.stringify(clubsList.map(c => ({ id: c.id, name: c.name, description: c.description })), null, 2)}

Dựa trên thông tin hồ sơ của tôi, hãy phân tích và gợi ý top 3 câu lạc bộ phù hợp nhất. 
Vui lòng trả về kết quả dưới định dạng JSON với cấu trúc chính xác như sau và không có bất kỳ markdown hay text nào khác:
{
  "recommendations": [
    {
      "clubId": "string (ID của câu lạc bộ được lấy từ danh sách)",
      "clubName": "string",
      "suitabilityScore": number (từ 0 đến 100),
      "matchReason": "string (Lý do phù hợp, viết bằng tiếng Việt, khoảng 2-3 câu)"
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return { recommendations: [] };
  } catch (error) {
    console.error("Error generating recommendations from Gemini:", error);
    return { recommendations: [] };
  }
};

export const generateAIResponse = async (
  message: string,
  history: { role: string, parts: any[] }[],
  userRole: string,
  userProfile?: User | any,
  clubsList?: Club[] | any[]
) => {
  let systemInstruction = `Bạn là Trợ lý AI của HUTECH Student Clubs. 
Người dùng đang trò chuyện với bạn có vai trò là: ${userRole}.
Hãy hỗ trợ họ nhiệt tình, ngắn gọn và hữu ích nhất.`;

  if (userProfile) {
    systemInstruction += `\n\nThông tin hồ sơ người dùng hiện tại:
- Chuyên ngành: ${userProfile.major || 'Chưa cập nhật'}
- Sở thích: ${userProfile.interests || 'Chưa cập nhật'}
- Kỹ năng: ${userProfile.skills || 'Chưa cập nhật'}
- Giới thiệu bản thân: ${userProfile.bio || 'Chưa cập nhật'}`;
  }

  if (clubsList && clubsList.length > 0) {
    const clubsStr = clubsList.map((c: any) => `- ${c.name} (Lĩnh vực: ${c.category}): ${c.description}`).join('\n');
    systemInstruction += `\n\nDanh sách các Câu lạc bộ hiện có tại HUTECH:\n${clubsStr}\n\nNếu người dùng yêu cầu gợi ý CLB, hãy sử dụng thông tin hồ sơ của họ và danh sách CLB này để đề xuất đúng 3 CLB phù hợp nhất. 
YÊU CẦU QUAN TRỌNG: Câu trả lời phải cực kỳ NGẮN GỌN. Chỉ dùng gạch đầu dòng liệt kê 3 câu lạc bộ kèm 1 câu lý do rất ngắn gọn (tối đa 15 chữ cho mỗi lý do). KHÔNG viết dài dòng.`;
  }

  try {
    const formattedHistory = history.map(m => ({
      role: m.role,
      parts: m.parts.map(p => ({ text: p.text }))
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction,
      }
    });

    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    return "Xin lỗi, hiện tại tôi đang gặp sự cố kết nối. Vui lòng thử lại sau nhé!";
  }
};
