import { Landmark, ScheduledTask } from "./types";

export const DEFAULT_LANDMARKS: Landmark[] = [
  {
    id: "loc-home",
    name: "溫馨高牆堡壘 (家)",
    emoji: "🏠",
    description: "拖延的最強溫床，沙發有黑洞引力",
    lat: 24.1500,
    lng: 120.6830
  },
  {
    id: "loc-nutc",
    name: "國立台中科技大學",
    emoji: "🏫",
    description: "充滿壓力的學術課堂與出勤計分戰場",
    lat: 24.1506,
    lng: 120.6845
  },
  {
    id: "loc-yizhong",
    name: "一中街商圈",
    emoji: "🍜",
    description: "美味誘人的晚餐美食與逛街天堂",
    lat: 24.1485,
    lng: 120.6853
  },
  {
    id: "loc-office",
    name: "星創極客辦公室",
    emoji: "💼",
    description: "充滿緊迫盯人主管與無限會議的戰壕",
    lat: 24.1560,
    lng: 120.6620
  },
  {
    id: "loc-gym",
    name: "巨石體能訓練中心 (健身房)",
    emoji: "🏋️",
    description: "擺脫罪惡感、泵感與汗水的抗老陣地",
    lat: 24.1610,
    lng: 120.6720
  },
  {
    id: "loc-coffee",
    name: "微光文青咖啡廳",
    emoji: "☕",
    description: "佯裝自己在工作的神仙淨土",
    lat: 24.1432,
    lng: 120.6732
  }
];

export const BUTLER_METADATA = {
  classic: {
    name: "優雅品味時光管家",
    avatar: "🤵",
    desc: "優雅溫和、一針見血，重視生活留白與大腦認知，您的專屬逆時特助。",
    quote: "尊貴的主人，時間不會主動等待，您的拖延藉口在物理法則面前毫無防護。"
  },
  star_idol: {
    name: "閃耀星途經紀人",
    avatar: "👑",
    desc: "傲嬌毒舌本命，滿嘴飯圈黑話、搶票序號，對您的遲到零容忍！",
    quote: "喂！還在賴床？我的演唱會序號馬上發放！再不出發你就只能在蛋頂吹風了！"
  },
  racing: {
    name: "維修區毒舌總監",
    avatar: "🏎️",
    desc: "極速賽車維修調度，滿腦子秒數、進站策略、起跑燈，逼您迅速提速！",
    quote: "暖胎圈已結束！紅燈隨時熄滅！如果你還在發呆，我就要在耳麥裡大罵了！"
  },
  anime: {
    name: "動漫萌系妖精莉莉絲",
    avatar: "🧚‍♀️",
    desc: "二次元超萌傲嬌妖精，宣稱您的遲到將導致時序線崩毀與 Bad Ending。",
    quote: "哼...本妖精才、才不是想拉你出門呢！只是時光防線垮掉的話，世界的線條會壞掉啦！"
  },
  fitness: {
    name: "魔鬼增肌減脂教練",
    avatar: "💪",
    desc: "高強度魔鬼健身教練，滿嘴乳清蛋白與有氧鍛鍊，拒絕任何軟爛藉口！",
    quote: "沒有藉口！脂肪不會為你的拖延買單！10秒鐘內立刻背上包包出發，當作有氧熱身！"
  },
  cats_master: {
    name: "高冷傲嬌貓主子",
    avatar: "🐱",
    desc: "高冷蔑視、傲嬌貓主子。滿口罐罐與貓草，喵喵叫催您快點出門賺奴才錢。",
    quote: "喵嗚…你還不趕快出門去賺本罐罐的錢？如果你遲到了，今晚就自己清貓砂吧！"
  },
  workplace: {
    name: "敏捷外商高階主管",
    avatar: "👩‍💼",
    desc: "外商高階諮詢顧問。滿口推動對齊、精準痛點與高產能敏捷時空思考。",
    quote: "這個行程的 Deadline 是不可妥協的核心指標。讓我們馬上 alignment，立即動身！"
  },
  custom: {
    name: "自訂主題大腦",
    avatar: "🧠",
    desc: "100% 依據您自訂的管家設定。魔鬼班長、傲嬌貓主、或者是嘮叨阿嬤...",
    quote: "防線已建立，列隊排好！有我在此坐鎮，誰也別想在我的防線上耽誤半秒！"
  }
};

export const INITIAL_TASKS: ScheduledTask[] = [
  {
    id: "task-1",
    rawTime: "14:30",
    title: "📸 實戰攝影與光影美學課",
    buffer: 15,
    fromLoc: "loc-home",
    toLoc: "loc-nutc",
    travelMode: "transit",
    commuteTime: 25,
    status: "scheduled",
    coachAdvice: "攝影的精髓是捕捉光線，如果你遲到了，大自然最美的夕陽是不會等你的。",
    funnyFact: "‘找相機記憶卡’和‘擦拭鏡頭’是你今天最完美的拖延藉口。"
  },
  {
    id: "task-2",
    rawTime: "17:30",
    title: "🍜 一中街深夜美食大進攻",
    buffer: 10,
    fromLoc: "loc-nutc",
    toLoc: "loc-yizhong",
    travelMode: "walk",
    commuteTime: 12,
    status: "scheduled",
    coachAdvice: "肚子餓的時候大腦會更想拖延。提早 10 分鐘，熱門排隊拉麵店就不用等了。",
    funnyFact: "‘等下還要走過去’的念頭，會讓你多在課堂坐 15 分鐘玩手機。"
  }
];
