import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChatbotHook } from "./useChatbot";

interface ContactFormProps {
  chatbot: ChatbotHook;
}

export const ContactForm = ({ chatbot }: ContactFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(chatbot.language);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    chatbot.submitContactForm({ name, email, phone, language: selectedLanguage });
  };

  return (
    <div className="p-4 bg-accent rounded-lg space-y-4">
      <p className="text-sm font-medium">Perfect! Can I get your contact details?</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="name" className="text-xs">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-xs">Email *</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="phone" className="text-xs">Phone *</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="language" className="text-xs">Preferred Language *</Label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">🇬🇧 English</SelectItem>
              <SelectItem value="es">🇪🇸 Spanish</SelectItem>
              <SelectItem value="de">🇩🇪 German</SelectItem>
              <SelectItem value="nl">🇳🇱 Dutch</SelectItem>
              <SelectItem value="fr">🇫🇷 French</SelectItem>
              <SelectItem value="pl">🇵🇱 Polish</SelectItem>
              <SelectItem value="sv">🇸🇪 Swedish</SelectItem>
              <SelectItem value="da">🇩🇰 Danish</SelectItem>
              <SelectItem value="hu">🇭🇺 Hungarian</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full">
          Submit
        </Button>
      </form>
    </div>
  );
};
