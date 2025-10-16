-- Create chatbot_conversations table
CREATE TABLE public.chatbot_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  preferred_language TEXT,
  property_type TEXT,
  budget_range TEXT,
  area TEXT,
  conversation_transcript JSONB DEFAULT '[]'::jsonb,
  article_slug TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert (chatbot is public facing)
CREATE POLICY "Allow public insert to chatbot_conversations" 
ON public.chatbot_conversations 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow reading own conversations (for admin dashboard later)
CREATE POLICY "Allow public read access to chatbot_conversations" 
ON public.chatbot_conversations 
FOR SELECT 
USING (true);

-- Create index for faster queries by article_slug
CREATE INDEX idx_chatbot_conversations_article_slug ON public.chatbot_conversations(article_slug);

-- Create index for faster queries by created_at
CREATE INDEX idx_chatbot_conversations_created_at ON public.chatbot_conversations(created_at DESC);