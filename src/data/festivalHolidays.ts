export interface FestivalHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'national' | 'gazetted' | 'festival' | 'international' | 'observance' | 'academic';
  emoji: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  description?: string;
}

export const FESTIVAL_HOLIDAYS: FestivalHoliday[] = [
  // ==========================================
  // 2025 FESTIVALS & SPECIAL DAYS
  // ==========================================
  { id: '2025-01-01', name: "New Year's Day", date: '2025-01-01', type: 'international', emoji: '🎉', bgColor: 'bg-indigo-100', textColor: 'text-indigo-950', borderColor: 'border-indigo-800' },
  { id: '2025-01-13', name: 'Lohri', date: '2025-01-13', type: 'festival', emoji: '🔥', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2025-01-14', name: 'Makar Sankranti / Pongal', date: '2025-01-14', type: 'festival', emoji: '🪁', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2025-01-26', name: 'Republic Day', date: '2025-01-26', type: 'national', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2025-02-02', name: 'Vasant Panchami / Saraswati Puja', date: '2025-02-02', type: 'festival', emoji: '🪕', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800' },
  { id: '2025-02-26', name: 'Maha Shivratri', date: '2025-02-26', type: 'festival', emoji: '🕉️', bgColor: 'bg-purple-100', textColor: 'text-purple-950', borderColor: 'border-purple-800' },
  { id: '2025-03-14', name: 'Holi (Festival of Colors)', date: '2025-03-14', type: 'festival', emoji: '🎨', bgColor: 'bg-rose-100', textColor: 'text-rose-950', borderColor: 'border-rose-800' },
  { id: '2025-03-30', name: 'Ugadi / Gudi Padwa', date: '2025-03-30', type: 'festival', emoji: '🌿', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { id: '2025-03-31', name: 'Eid-ul-Fitr', date: '2025-03-31', type: 'festival', emoji: '🌙', bgColor: 'bg-teal-100', textColor: 'text-teal-950', borderColor: 'border-teal-800' },
  { id: '2025-04-06', name: 'Ram Navami', date: '2025-04-06', type: 'festival', emoji: '🏹', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2025-04-10', name: 'Mahavir Jayanti', date: '2025-04-10', type: 'festival', emoji: '🕊️', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2025-04-14', name: 'Ambedkar Jayanti / Baisakhi / Bohag Bihu', date: '2025-04-14', type: 'national', emoji: '📜', bgColor: 'bg-sky-100', textColor: 'text-sky-950', borderColor: 'border-sky-800' },
  { id: '2025-04-18', name: 'Good Friday', date: '2025-04-18', type: 'festival', emoji: '✝️', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-800' },
  { id: '2025-04-20', name: 'Easter Sunday', date: '2025-04-20', type: 'festival', emoji: '🐣', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800' },
  { id: '2025-05-12', name: 'Buddha Purnima', date: '2025-05-12', type: 'festival', emoji: '☸️', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2025-06-07', name: 'Eid-ul-Adha (Bakrid)', date: '2025-06-07', type: 'festival', emoji: '🌙', bgColor: 'bg-teal-100', textColor: 'text-teal-950', borderColor: 'border-teal-800' },
  { id: '2025-07-06', name: 'Muharram', date: '2025-07-06', type: 'festival', emoji: '🕌', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { id: '2025-08-09', name: 'Raksha Bandhan', date: '2025-08-09', type: 'festival', emoji: '🧵', bgColor: 'bg-pink-100', textColor: 'text-pink-950', borderColor: 'border-pink-800' },
  { id: '2025-08-15', name: 'Independence Day', date: '2025-08-15', type: 'national', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2025-08-16', name: 'Krishna Janmashtami', date: '2025-08-16', type: 'festival', emoji: '🦚', bgColor: 'bg-blue-100', textColor: 'text-blue-950', borderColor: 'border-blue-800' },
  { id: '2025-08-27', name: 'Ganesh Chaturthi', date: '2025-08-27', type: 'festival', emoji: '🐘', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2025-09-05', name: 'Milad-un-Nabi', date: '2025-09-05', type: 'festival', emoji: '🌙', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { id: '2025-09-05', name: 'Onam (Thiruvonam)', date: '2025-09-05', type: 'festival', emoji: '🌸', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800' },
  { id: '2025-10-02', name: 'Mahatma Gandhi Jayanti', date: '2025-10-02', type: 'national', emoji: '🕊️', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-800' },
  { id: '2025-10-02', name: 'Dussehra / Vijayadashami', date: '2025-10-02', type: 'festival', emoji: '🏹', bgColor: 'bg-red-100', textColor: 'text-red-950', borderColor: 'border-red-800' },
  { id: '2025-10-10', name: 'Karwa Chauth', date: '2025-10-10', type: 'festival', emoji: '🪞', bgColor: 'bg-rose-100', textColor: 'text-rose-950', borderColor: 'border-rose-800' },
  { id: '2025-10-20', name: 'Diwali (Deepavali)', date: '2025-10-20', type: 'festival', emoji: '🪔', bgColor: 'bg-amber-200', textColor: 'text-amber-950', borderColor: 'border-amber-900' },
  { id: '2025-10-22', name: 'Govardhan Puja / Bhai Dooj', date: '2025-10-22', type: 'festival', emoji: '🪔', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2025-10-27', name: 'Chhath Puja', date: '2025-10-27', type: 'festival', emoji: '🌅', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800' },
  { id: '2025-11-05', name: 'Guru Nanak Jayanti', date: '2025-11-05', type: 'festival', emoji: '🪔', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2025-12-25', name: 'Christmas Day', date: '2025-12-25', type: 'festival', emoji: '🎄', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-900' },

  // ==========================================
  // 2026 FESTIVALS & SPECIAL DAYS
  // ==========================================
  { id: '2026-01-01', name: "New Year's Day", date: '2026-01-01', type: 'international', emoji: '🎉', bgColor: 'bg-indigo-100', textColor: 'text-indigo-950', borderColor: 'border-indigo-800', description: 'Global celebration of the new calendar year' },
  { id: '2026-01-13', name: 'Lohri', date: '2026-01-13', type: 'festival', emoji: '🔥', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800', description: 'Punjabi winter solstice harvest festival' },
  { id: '2026-01-14', name: 'Makar Sankranti / Pongal / Magh Bihu', date: '2026-01-14', type: 'festival', emoji: '🪁', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800', description: 'Solar harvest festival celebrated across India' },
  { id: '2026-01-23', name: 'Netaji Subhas Chandra Bose Jayanti', date: '2026-01-23', type: 'observance', emoji: '🎖️', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800', description: 'Parakram Diwas honoring Netaji' },
  { id: '2026-01-24', name: 'Vasant Panchami / Saraswati Puja', date: '2026-01-24', type: 'festival', emoji: '🪕', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800', description: 'Festival honoring Goddess Saraswati & spring' },
  { id: '2026-01-26', name: 'Republic Day', date: '2026-01-26', type: 'national', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800', description: 'National Holiday celebrating the Indian Constitution' },
  { id: '2026-02-14', name: "Valentine's Day", date: '2026-02-14', type: 'international', emoji: '💖', bgColor: 'bg-rose-100', textColor: 'text-rose-950', borderColor: 'border-rose-800' },
  { id: '2026-02-15', name: 'Maha Shivratri', date: '2026-02-15', type: 'festival', emoji: '🕉️', bgColor: 'bg-purple-100', textColor: 'text-purple-950', borderColor: 'border-purple-800', description: 'Great Night of Shiva festival' },
  { id: '2026-02-28', name: 'National Science Day', date: '2026-02-28', type: 'observance', emoji: '🔬', bgColor: 'bg-sky-100', textColor: 'text-sky-950', borderColor: 'border-sky-800', description: 'Commemorating the Raman Effect discovery' },
  { id: '2026-03-03', name: 'Holika Dahan', date: '2026-03-03', type: 'festival', emoji: '🔥', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2026-03-04', name: 'Holi (Festival of Colors)', date: '2026-03-04', type: 'festival', emoji: '🎨', bgColor: 'bg-rose-100', textColor: 'text-rose-950', borderColor: 'border-rose-800', description: 'Vibrant national festival of colors and joy' },
  { id: '2026-03-08', name: "International Women's Day", date: '2026-03-08', type: 'international', emoji: '💐', bgColor: 'bg-pink-100', textColor: 'text-pink-950', borderColor: 'border-pink-800' },
  { id: '2026-03-19', name: 'Ugadi / Gudi Padwa / Cheti Chand', date: '2026-03-19', type: 'festival', emoji: '🌿', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800', description: 'Traditional Hindu Lunar New Year' },
  { id: '2026-03-21', name: 'Eid-ul-Fitr', date: '2026-03-21', type: 'festival', emoji: '🌙', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800', description: 'Celebration marking the conclusion of Ramadan' },
  { id: '2026-03-27', name: 'Ram Navami', date: '2026-03-27', type: 'festival', emoji: '🏹', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800', description: 'Celebration of the birth of Lord Rama' },
  { id: '2026-03-31', name: 'Mahavir Jayanti', date: '2026-03-31', type: 'festival', emoji: '🕊️', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800', description: 'Birth anniversary of Lord Mahavira' },
  { id: '2026-04-02', name: 'Hanuman Jayanti', date: '2026-04-02', type: 'festival', emoji: '🚩', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2026-04-03', name: 'Good Friday', date: '2026-04-03', type: 'festival', emoji: '✝️', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-700', description: 'Christian solemn commemoration of the crucifixion' },
  { id: '2026-04-05', name: 'Easter Sunday', date: '2026-04-05', type: 'festival', emoji: '🐣', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800', description: 'Christian feast of the Resurrection' },
  { id: '2026-04-14', name: 'Ambedkar Jayanti / Baisakhi / Vishu / Puthandu', date: '2026-04-14', type: 'national', emoji: '📜', bgColor: 'bg-sky-100', textColor: 'text-sky-950', borderColor: 'border-sky-800', description: 'Dr. B.R. Ambedkar Jayanti and solar New Year festivities' },
  { id: '2026-04-20', name: 'Akshaya Tritiya', date: '2026-04-20', type: 'festival', emoji: '🪙', bgColor: 'bg-amber-200', textColor: 'text-amber-950', borderColor: 'border-amber-900' },
  { id: '2026-04-22', name: 'Earth Day', date: '2026-04-22', type: 'international', emoji: '🌍', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { id: '2026-05-01', name: "May Day / International Workers' Day / Maharashtra & Gujarat Day", date: '2026-05-01', type: 'international', emoji: '🛠️', bgColor: 'bg-red-100', textColor: 'text-red-950', borderColor: 'border-red-800' },
  { id: '2026-05-27', name: 'Eid-ul-Adha (Bakrid)', date: '2026-05-27', type: 'festival', emoji: '🌙', bgColor: 'bg-teal-100', textColor: 'text-teal-950', borderColor: 'border-teal-800', description: 'Feast of the Sacrifice' },
  { id: '2026-05-31', name: 'Buddha Purnima', date: '2026-05-31', type: 'festival', emoji: '☸️', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800', description: 'Birth, enlightenment & parinirvana of Gautama Buddha' },
  { id: '2026-06-05', name: 'World Environment Day', date: '2026-06-05', type: 'international', emoji: '🌱', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { id: '2026-06-21', name: 'International Yoga Day', date: '2026-06-21', type: 'international', emoji: '🧘', bgColor: 'bg-sky-100', textColor: 'text-sky-950', borderColor: 'border-sky-800', description: 'Global celebration of Yoga & Wellness' },
  { id: '2026-06-26', name: 'Muharram (Ashura)', date: '2026-06-26', type: 'festival', emoji: '🕌', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800', description: 'Islamic holy month remembrance' },
  { id: '2026-07-01', name: "National Doctor's Day", date: '2026-07-01', type: 'observance', emoji: '🩺', bgColor: 'bg-blue-100', textColor: 'text-blue-950', borderColor: 'border-blue-800' },
  { id: '2026-07-16', name: 'Rath Yatra (Puri)', date: '2026-07-16', type: 'festival', emoji: '🛕', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800', description: 'Chariot festival of Lord Jagannath' },
  { id: '2026-07-26', name: 'Kargil Vijay Diwas', date: '2026-07-26', type: 'observance', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2026-07-29', name: 'Guru Purnima', date: '2026-07-29', type: 'festival', emoji: '🪔', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800', description: 'Day dedicated to honoring spiritual and academic teachers' },
  { id: '2026-08-02', name: 'Friendship Day', date: '2026-08-02', type: 'international', emoji: '🤝', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800' },
  { id: '2026-08-15', name: 'Independence Day', date: '2026-08-15', type: 'national', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800', description: '80th Indian Independence Day celebration' },
  { id: '2026-08-16', name: 'Parsi New Year (Navroz / Pateti)', date: '2026-08-16', type: 'festival', emoji: '🌸', bgColor: 'bg-purple-100', textColor: 'text-purple-950', borderColor: 'border-purple-800' },
  { id: '2026-08-26', name: 'Onam (Thiruvonam)', date: '2026-08-26', type: 'festival', emoji: '🌸', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800', description: 'Harvest festival of Kerala' },
  { id: '2026-08-28', name: 'Raksha Bandhan', date: '2026-08-28', type: 'festival', emoji: '🧵', bgColor: 'bg-pink-100', textColor: 'text-pink-950', borderColor: 'border-pink-800', description: 'Celebration of love and duty between brothers and sisters' },
  { id: '2026-09-04', name: 'Krishna Janmashtami', date: '2026-09-04', type: 'festival', emoji: '🦚', bgColor: 'bg-blue-100', textColor: 'text-blue-950', borderColor: 'border-blue-800', description: 'Celebration of the birth of Lord Krishna' },
  { id: '2026-09-05', name: "National Teachers' Day", date: '2026-09-05', type: 'observance', emoji: '📚', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800', description: 'Dr. Sarvepalli Radhakrishnan birth anniversary' },
  { id: '2026-09-14', name: 'Ganesh Chaturthi', date: '2026-09-14', type: 'festival', emoji: '🐘', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800', description: 'Grand festival of Lord Ganesha' },
  { id: '2026-09-14', name: 'Hindi Diwas', date: '2026-09-14', type: 'observance', emoji: '📖', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-800' },
  { id: '2026-09-15', name: "Engineers' Day (India)", date: '2026-09-15', type: 'observance', emoji: '⚙️', bgColor: 'bg-blue-100', textColor: 'text-blue-950', borderColor: 'border-blue-800', description: 'Sir M. Visvesvaraya birth anniversary' },
  { id: '2026-09-15', name: 'Milad-un-Nabi (Eid-e-Milad)', date: '2026-09-15', type: 'festival', emoji: '🌙', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800', description: 'Prophet Muhammad birthday observance' },
  { id: '2026-10-02', name: 'Mahatma Gandhi Jayanti & Lal Bahadur Shastri Jayanti', date: '2026-10-02', type: 'national', emoji: '🕊️', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-800', description: 'National Holiday commemorating the Father of the Nation' },
  { id: '2026-10-08', name: 'Indian Air Force Day', date: '2026-10-08', type: 'observance', emoji: '✈️', bgColor: 'bg-sky-100', textColor: 'text-sky-950', borderColor: 'border-sky-800' },
  { id: '2026-10-11', name: 'Navratri Begins / Ghatasthapana', date: '2026-10-11', type: 'festival', emoji: '🪔', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2026-10-18', name: 'Maha Ashtami / Durga Ashtami', date: '2026-10-18', type: 'festival', emoji: '🔱', bgColor: 'bg-rose-100', textColor: 'text-rose-950', borderColor: 'border-rose-800', description: 'Durga Puja Maha Ashtami' },
  { id: '2026-10-19', name: 'Maha Navami', date: '2026-10-19', type: 'festival', emoji: '🔱', bgColor: 'bg-rose-100', textColor: 'text-rose-950', borderColor: 'border-rose-800' },
  { id: '2026-10-20', name: 'Dussehra / Vijayadashami', date: '2026-10-20', type: 'festival', emoji: '🏹', bgColor: 'bg-red-100', textColor: 'text-red-950', borderColor: 'border-red-800', description: 'Victory of Good over Evil' },
  { id: '2026-10-29', name: 'Karwa Chauth', date: '2026-10-29', type: 'festival', emoji: '🪞', bgColor: 'bg-rose-100', textColor: 'text-rose-950', borderColor: 'border-rose-800' },
  { id: '2026-10-31', name: 'National Unity Day (Rashtriya Ekta Diwas) & Halloween', date: '2026-10-31', type: 'observance', emoji: '🎃', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800', description: 'Sardar Vallabhbhai Patel birth anniversary' },
  { id: '2026-11-06', name: 'Dhanteras', date: '2026-11-06', type: 'festival', emoji: '🪙', bgColor: 'bg-amber-200', textColor: 'text-amber-950', borderColor: 'border-amber-900', description: 'Festival of wealth and prosperity' },
  { id: '2026-11-08', name: 'Diwali (Deepavali / Lakshmi Puja)', date: '2026-11-08', type: 'festival', emoji: '🪔', bgColor: 'bg-amber-200', textColor: 'text-amber-950', borderColor: 'border-amber-900', description: 'Grand national Festival of Lights' },
  { id: '2026-11-09', name: 'Govardhan Puja', date: '2026-11-09', type: 'festival', emoji: '🪔', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2026-11-10', name: 'Bhai Dooj', date: '2026-11-10', type: 'festival', emoji: '🧵', bgColor: 'bg-pink-100', textColor: 'text-pink-950', borderColor: 'border-pink-800' },
  { id: '2026-11-14', name: "Children's Day (Bal Diwas)", date: '2026-11-14', type: 'observance', emoji: '🎈', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800', description: 'Pandit Jawaharlal Nehru birth anniversary' },
  { id: '2026-11-15', name: 'Chhath Puja (Sandhya Arghya)', date: '2026-11-15', type: 'festival', emoji: '🌅', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800', description: 'Ancient Vedic Sun God celebration' },
  { id: '2026-11-16', name: 'Chhath Puja (Usha Arghya)', date: '2026-11-16', type: 'festival', emoji: '🌅', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800' },
  { id: '2026-11-24', name: 'Guru Nanak Jayanti (Gurpurab)', date: '2026-11-24', type: 'festival', emoji: '🪔', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800', description: '557th Prakash Utsav of Guru Nanak Dev Ji' },
  { id: '2026-11-26', name: 'Constitution Day (Samvidhan Divas) & Thanksgiving', date: '2026-11-26', type: 'observance', emoji: '📜', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-800' },
  { id: '2026-12-04', name: 'Indian Navy Day', date: '2026-12-04', type: 'observance', emoji: '⚓', bgColor: 'bg-blue-100', textColor: 'text-blue-950', borderColor: 'border-blue-800' },
  { id: '2026-12-22', name: 'National Mathematics Day', date: '2026-12-22', type: 'observance', emoji: '📐', bgColor: 'bg-indigo-100', textColor: 'text-indigo-950', borderColor: 'border-indigo-800', description: 'Srinivasa Ramanujan birth anniversary' },
  { id: '2026-12-23', name: "Kisan Diwas (National Farmers' Day)", date: '2026-12-23', type: 'observance', emoji: '🌾', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { id: '2026-12-24', name: 'Christmas Eve', date: '2026-12-24', type: 'festival', emoji: '🕯️', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-900' },
  { id: '2026-12-25', name: 'Christmas Day', date: '2026-12-25', type: 'festival', emoji: '🎄', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-900', description: 'Celebration of the Nativity of Jesus Christ' },
  { id: '2026-12-31', name: "New Year's Eve", date: '2026-12-31', type: 'international', emoji: '🎆', bgColor: 'bg-purple-100', textColor: 'text-purple-950', borderColor: 'border-purple-800', description: 'Eve of the new calendar year' },

  // ==========================================
  // 2027 FESTIVALS & SPECIAL DAYS
  // ==========================================
  { id: '2027-01-01', name: "New Year's Day", date: '2027-01-01', type: 'international', emoji: '🎉', bgColor: 'bg-indigo-100', textColor: 'text-indigo-950', borderColor: 'border-indigo-800' },
  { id: '2027-01-14', name: 'Makar Sankranti / Pongal', date: '2027-01-14', type: 'festival', emoji: '🪁', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2027-01-26', name: 'Republic Day', date: '2027-01-26', type: 'national', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2027-02-12', name: 'Vasant Panchami', date: '2027-02-12', type: 'festival', emoji: '🪕', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800' },
  { id: '2027-03-06', name: 'Maha Shivratri', date: '2027-03-06', type: 'festival', emoji: '🕉️', bgColor: 'bg-purple-100', textColor: 'text-purple-950', borderColor: 'border-purple-800' },
  { id: '2027-03-10', name: 'Eid-ul-Fitr', date: '2027-03-10', type: 'festival', emoji: '🌙', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { id: '2027-03-22', name: 'Holi (Festival of Colors)', date: '2027-03-22', type: 'festival', emoji: '🎨', bgColor: 'bg-rose-100', textColor: 'text-rose-950', borderColor: 'border-rose-800' },
  { id: '2027-03-26', name: 'Good Friday', date: '2027-03-26', type: 'festival', emoji: '✝️', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-800' },
  { id: '2027-03-28', name: 'Easter Sunday', date: '2027-03-28', type: 'festival', emoji: '🐣', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800' },
  { id: '2027-04-07', name: 'Ugadi / Gudi Padwa', date: '2027-04-07', type: 'festival', emoji: '🌿', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { id: '2027-04-14', name: 'Ambedkar Jayanti / Baisakhi', date: '2027-04-14', type: 'national', emoji: '📜', bgColor: 'bg-sky-100', textColor: 'text-sky-950', borderColor: 'border-sky-800' },
  { id: '2027-04-15', name: 'Ram Navami', date: '2027-04-15', type: 'festival', emoji: '🏹', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2027-04-19', name: 'Mahavir Jayanti', date: '2027-04-19', type: 'festival', emoji: '🕊️', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2027-05-17', name: 'Eid-ul-Adha (Bakrid)', date: '2027-05-17', type: 'festival', emoji: '🌙', bgColor: 'bg-teal-100', textColor: 'text-teal-950', borderColor: 'border-teal-800' },
  { id: '2027-05-20', name: 'Buddha Purnima', date: '2027-05-20', type: 'festival', emoji: '☸️', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2027-06-16', name: 'Muharram', date: '2027-06-16', type: 'festival', emoji: '🕌', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { id: '2027-08-15', name: 'Independence Day', date: '2027-08-15', type: 'national', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2027-08-17', name: 'Raksha Bandhan', date: '2027-08-17', type: 'festival', emoji: '🧵', bgColor: 'bg-pink-100', textColor: 'text-pink-950', borderColor: 'border-pink-800' },
  { id: '2027-08-25', name: 'Krishna Janmashtami', date: '2027-08-25', type: 'festival', emoji: '🦚', bgColor: 'bg-blue-100', textColor: 'text-blue-950', borderColor: 'border-blue-800' },
  { id: '2027-09-04', name: 'Ganesh Chaturthi', date: '2027-09-04', type: 'festival', emoji: '🐘', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2027-09-13', name: 'Onam', date: '2027-09-13', type: 'festival', emoji: '🌸', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800' },
  { id: '2027-10-02', name: 'Mahatma Gandhi Jayanti', date: '2027-10-02', type: 'national', emoji: '🕊️', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-800' },
  { id: '2027-10-09', name: 'Dussehra / Vijayadashami', date: '2027-10-09', type: 'festival', emoji: '🏹', bgColor: 'bg-red-100', textColor: 'text-red-950', borderColor: 'border-red-800' },
  { id: '2027-10-29', name: 'Diwali (Deepavali)', date: '2027-10-29', type: 'festival', emoji: '🪔', bgColor: 'bg-amber-200', textColor: 'text-amber-950', borderColor: 'border-amber-900' },
  { id: '2027-11-04', name: 'Chhath Puja', date: '2027-11-04', type: 'festival', emoji: '🌅', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800' },
  { id: '2027-11-14', name: 'Guru Nanak Jayanti', date: '2027-11-14', type: 'festival', emoji: '🪔', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2027-12-25', name: 'Christmas Day', date: '2027-12-25', type: 'festival', emoji: '🎄', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-900' },

  // ==========================================
  // 2028 FESTIVALS & SPECIAL DAYS
  // ==========================================
  { id: '2028-01-01', name: "New Year's Day", date: '2028-01-01', type: 'international', emoji: '🎉', bgColor: 'bg-indigo-100', textColor: 'text-indigo-950', borderColor: 'border-indigo-800' },
  { id: '2028-01-14', name: 'Makar Sankranti / Pongal', date: '2028-01-14', type: 'festival', emoji: '🪁', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800' },
  { id: '2028-01-26', name: 'Republic Day', date: '2028-01-26', type: 'national', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2028-02-28', name: 'Eid-ul-Fitr', date: '2028-02-28', type: 'festival', emoji: '🌙', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { id: '2028-03-11', name: 'Holi (Festival of Colors)', date: '2028-03-11', type: 'festival', emoji: '🎨', bgColor: 'bg-rose-100', textColor: 'text-rose-950', borderColor: 'border-rose-800' },
  { id: '2028-04-14', name: 'Good Friday / Ambedkar Jayanti', date: '2028-04-14', type: 'national', emoji: '📜', bgColor: 'bg-sky-100', textColor: 'text-sky-950', borderColor: 'border-sky-800' },
  { id: '2028-08-15', name: 'Independence Day', date: '2028-08-15', type: 'national', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { id: '2028-10-02', name: 'Mahatma Gandhi Jayanti', date: '2028-10-02', type: 'national', emoji: '🕊️', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-800' },
  { id: '2028-10-17', name: 'Diwali (Deepavali)', date: '2028-10-17', type: 'festival', emoji: '🪔', bgColor: 'bg-amber-200', textColor: 'text-amber-950', borderColor: 'border-amber-900' },
  { id: '2028-12-25', name: 'Christmas Day', date: '2028-12-25', type: 'festival', emoji: '🎄', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-900' }
];

// Fixed recurring date-matching fallback (covers any year for national, fixed cultural and international days)
const RECURRING_ANNUAL_HOLIDAYS: (Omit<FestivalHoliday, 'id' | 'date'> & { monthDay: string })[] = [
  { monthDay: '01-01', name: "New Year's Day", type: 'international', emoji: '🎉', bgColor: 'bg-indigo-100', textColor: 'text-indigo-950', borderColor: 'border-indigo-800', description: 'Global celebration of the new year' },
  { monthDay: '01-12', name: 'National Youth Day (Vivekananda Jayanti)', type: 'observance', emoji: '🧘', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800', description: 'Swami Vivekananda birth anniversary' },
  { monthDay: '01-15', name: 'Indian Army Day', type: 'observance', emoji: '🎖️', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800', description: 'Honoring Field Marshal K. M. Cariappa & Indian Army' },
  { monthDay: '01-23', name: 'Netaji Subhas Chandra Bose Jayanti (Parakram Diwas)', type: 'observance', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { monthDay: '01-24', name: 'National Girl Child Day', type: 'observance', emoji: '👧', bgColor: 'bg-pink-100', textColor: 'text-pink-950', borderColor: 'border-pink-800' },
  { monthDay: '01-25', name: 'National Voters Day / National Tourism Day', type: 'observance', emoji: '🗳️', bgColor: 'bg-sky-100', textColor: 'text-sky-950', borderColor: 'border-sky-800' },
  { monthDay: '01-26', name: 'Republic Day', type: 'national', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800', description: 'Commemorating the enactment of the Constitution of India' },
  { monthDay: '01-30', name: "Martyrs' Day (Shaheed Diwas)", type: 'observance', emoji: '🕊️', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-800' },
  { monthDay: '02-14', name: "Valentine's Day", type: 'international', emoji: '💖', bgColor: 'bg-rose-100', textColor: 'text-rose-950', borderColor: 'border-rose-800' },
  { monthDay: '02-28', name: 'National Science Day', type: 'observance', emoji: '🔬', bgColor: 'bg-sky-100', textColor: 'text-sky-950', borderColor: 'border-sky-800', description: 'Discovery of the Raman Effect by Sir C.V. Raman' },
  { monthDay: '03-08', name: "International Women's Day", type: 'international', emoji: '💐', bgColor: 'bg-pink-100', textColor: 'text-pink-950', borderColor: 'border-pink-800' },
  { monthDay: '03-14', name: 'International Pi Day', type: 'international', emoji: '🥧', bgColor: 'bg-indigo-100', textColor: 'text-indigo-950', borderColor: 'border-indigo-800' },
  { monthDay: '03-23', name: 'Shaheed Diwas (Bhagat Singh, Rajguru, Sukhdev)', type: 'observance', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { monthDay: '04-01', name: "April Fools' Day / Odisha Day (Utkala Dibasa)", type: 'international', emoji: '🃏', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800' },
  { monthDay: '04-07', name: 'World Health Day', type: 'international', emoji: '🏥', bgColor: 'bg-teal-100', textColor: 'text-teal-950', borderColor: 'border-teal-800' },
  { monthDay: '04-14', name: 'Dr. B.R. Ambedkar Jayanti', type: 'national', emoji: '📜', bgColor: 'bg-sky-100', textColor: 'text-sky-950', borderColor: 'border-sky-800', description: 'Birth anniversary of Dr. B.R. Ambedkar' },
  { monthDay: '04-22', name: 'Earth Day', type: 'international', emoji: '🌍', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { monthDay: '05-01', name: "International Workers' Day / Maharashtra & Gujarat Day", type: 'international', emoji: '🛠️', bgColor: 'bg-red-100', textColor: 'text-red-950', borderColor: 'border-red-800' },
  { monthDay: '05-11', name: 'National Technology Day', type: 'observance', emoji: '🚀', bgColor: 'bg-blue-100', textColor: 'text-blue-950', borderColor: 'border-blue-800' },
  { monthDay: '06-05', name: 'World Environment Day', type: 'international', emoji: '🌱', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { monthDay: '06-21', name: 'International Yoga Day & World Music Day', type: 'international', emoji: '🧘', bgColor: 'bg-sky-100', textColor: 'text-sky-950', borderColor: 'border-sky-800' },
  { monthDay: '07-01', name: "National Doctor's Day & Chartered Accountants Day", type: 'observance', emoji: '🩺', bgColor: 'bg-blue-100', textColor: 'text-blue-950', borderColor: 'border-blue-800' },
  { monthDay: '07-26', name: 'Kargil Vijay Diwas', type: 'observance', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { monthDay: '08-15', name: 'Independence Day', type: 'national', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800', description: 'Indian Independence Day celebration' },
  { monthDay: '08-29', name: 'National Sports Day (Rashtriya Khel Divas)', type: 'observance', emoji: '🏑', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800', description: 'Major Dhyan Chand birth anniversary' },
  { monthDay: '09-05', name: "National Teachers' Day", type: 'observance', emoji: '📚', bgColor: 'bg-amber-100', textColor: 'text-amber-950', borderColor: 'border-amber-800', description: 'Dr. Sarvepalli Radhakrishnan birth anniversary' },
  { monthDay: '09-14', name: 'Hindi Diwas', type: 'observance', emoji: '📖', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-800' },
  { monthDay: '09-15', name: "Engineers' Day & International Day of Democracy", type: 'observance', emoji: '⚙️', bgColor: 'bg-blue-100', textColor: 'text-blue-950', borderColor: 'border-blue-800', description: 'Bharat Ratna Sir M. Visvesvaraya birth anniversary' },
  { monthDay: '10-02', name: 'Mahatma Gandhi Jayanti & Lal Bahadur Shastri Jayanti', type: 'national', emoji: '🕊️', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-800', description: 'National holiday in honor of Mahatma Gandhi' },
  { monthDay: '10-08', name: 'Indian Air Force Day', type: 'observance', emoji: '✈️', bgColor: 'bg-sky-100', textColor: 'text-sky-950', borderColor: 'border-sky-800' },
  { monthDay: '10-15', name: "World Students' Day (Dr. APJ Abdul Kalam Jayanti)", type: 'observance', emoji: '🚀', bgColor: 'bg-blue-100', textColor: 'text-blue-950', borderColor: 'border-blue-800' },
  { monthDay: '10-31', name: 'National Unity Day (Rashtriya Ekta Diwas) & Halloween', type: 'observance', emoji: '🎃', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800', description: 'Sardar Vallabhbhai Patel birth anniversary' },
  { monthDay: '11-14', name: "Children's Day (Bal Diwas)", type: 'observance', emoji: '🎈', bgColor: 'bg-yellow-100', textColor: 'text-yellow-950', borderColor: 'border-yellow-800', description: 'Pandit Jawaharlal Nehru birth anniversary' },
  { monthDay: '11-26', name: 'National Law Day / Constitution Day (Samvidhan Divas)', type: 'observance', emoji: '📜', bgColor: 'bg-stone-200', textColor: 'text-stone-900', borderColor: 'border-stone-800' },
  { monthDay: '12-04', name: 'Indian Navy Day', type: 'observance', emoji: '⚓', bgColor: 'bg-blue-100', textColor: 'text-blue-950', borderColor: 'border-blue-800' },
  { monthDay: '12-16', name: 'Vijay Diwas', type: 'observance', emoji: '🇮🇳', bgColor: 'bg-orange-100', textColor: 'text-orange-950', borderColor: 'border-orange-800' },
  { monthDay: '12-22', name: 'National Mathematics Day', type: 'observance', emoji: '📐', bgColor: 'bg-indigo-100', textColor: 'text-indigo-950', borderColor: 'border-indigo-800', description: 'Srinivasa Ramanujan birth anniversary' },
  { monthDay: '12-23', name: "Kisan Diwas (National Farmers' Day)", type: 'observance', emoji: '🌾', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-800' },
  { monthDay: '12-24', name: 'National Consumer Rights Day / Christmas Eve', type: 'festival', emoji: '🕯️', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-900' },
  { monthDay: '12-25', name: 'Christmas Day & Good Governance Day', type: 'festival', emoji: '🎄', bgColor: 'bg-emerald-100', textColor: 'text-emerald-950', borderColor: 'border-emerald-900', description: 'Celebration of Christmas and Atal Bihari Vajpayee Jayanti' },
  { monthDay: '12-31', name: "New Year's Eve", type: 'international', emoji: '🎆', bgColor: 'bg-purple-100', textColor: 'text-purple-950', borderColor: 'border-purple-800', description: 'Eve of the new calendar year' }
];

/**
 * Returns all festival holidays and observances matching a given date string (YYYY-MM-DD).
 */
export function getFestivalsForDate(dateStr: string): FestivalHoliday[] {
  const directMatches = FESTIVAL_HOLIDAYS.filter(h => h.date === dateStr);
  if (directMatches.length > 0) {
    return directMatches;
  }

  // Fallback to recurring monthDay match if exact year entry is not present
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const monthDay = `${parts[1]}-${parts[2]}`;
    const recurringMatches = RECURRING_ANNUAL_HOLIDAYS.filter(r => r.monthDay === monthDay);
    if (recurringMatches.length > 0) {
      return recurringMatches.map((recurring, idx) => ({
        id: `rec-${dateStr}-${idx}`,
        name: recurring.name,
        date: dateStr,
        type: recurring.type,
        emoji: recurring.emoji,
        bgColor: recurring.bgColor,
        textColor: recurring.textColor,
        borderColor: recurring.borderColor,
        description: recurring.description
      }));
    }
  }

  return [];
}
