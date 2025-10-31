export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

export const countWords = (text: string): number => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

export const getWordCountStatus = (count: number, min: number, max: number) => {
  if (count < min) return { color: 'text-amber-600', message: `${min - count} words below optimal` };
  if (count > max) return { color: 'text-amber-600', message: `${count - max} words above optimal` };
  return { color: 'text-green-600', message: 'Optimal word count' };
};

export const getCharCountStatus = (count: number, max: number) => {
  if (count > max) return { color: 'text-red-600', message: `${count - max} characters over limit` };
  if (count > max * 0.9) return { color: 'text-amber-600', message: `${max - count} characters remaining` };
  return { color: 'text-muted-foreground', message: `${count}/${max}` };
};

export const uploadImage = async (file: File, supabase: any): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('article-images')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('article-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

/**
 * Analyzes H2 sections in content and returns statistics
 */
export interface ContentSection {
  heading: string;
  position: number;
  wordCount: number;
  hasCitation: boolean;
}

export const analyzeContentSections = (content: string): ContentSection[] => {
  const h2Pattern = /<h2[^>]*>(.*?)<\/h2>/gs;
  const h2Matches = [...content.matchAll(h2Pattern)];
  
  const sections: ContentSection[] = [];
  
  h2Matches.forEach((match, index) => {
    const heading = match[1].replace(/<[^>]*>/g, '').trim();
    const position = content.indexOf(match[0]);
    
    // Get content between this H2 and the next (or end)
    const nextH2 = h2Matches[index + 1];
    const sectionEnd = nextH2 ? content.indexOf(nextH2[0]) : content.length;
    const sectionContent = content.substring(position, sectionEnd);
    
    // Count words in this section
    const textContent = sectionContent.replace(/<[^>]*>/g, ' ');
    const wordCount = textContent.trim().split(/\s+/).length;
    
    // Check if section has citations
    const hasCitation = sectionContent.includes('class="inline-citation"') || 
                        sectionContent.includes('According to');
    
    sections.push({
      heading,
      position,
      wordCount,
      hasCitation
    });
  });
  
  return sections;
};
