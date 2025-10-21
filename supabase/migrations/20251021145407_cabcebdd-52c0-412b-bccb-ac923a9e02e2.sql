-- Drop the public read access policy
DROP POLICY IF EXISTS "Allow public read access to chatbot_conversations" ON public.chatbot_conversations;

-- Create a new policy: Only admins can view chatbot conversations
CREATE POLICY "Admins can view chatbot conversations"
ON public.chatbot_conversations
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Keep the public insert policy so users can submit chatbot conversations
-- (Already exists: "Allow public insert to chatbot_conversations")