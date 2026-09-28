import { db, email, browser, storage } from "hatchable";
import { content } from "./content-i18n.js";

const FREE_SNAPSHOT_COPY={};

// STAGING project base URL. Keep LIVE email links isolated from STAGING deployments.
const BASE_URL = "https://re9vzi.hatchable.site";

const LEGAL_FOOTER_HTML = `<div style="margin-top:18px;padding-top:14px;border-top:1px solid #e7e0d4;font-size:10px;line-height:1.55;color:#6d675f">
  <b style="color:#191715">GLOW AI™ · SEE YOUR GLOW. START YOUR JOURNEY.</b>
  <p style="margin:8px 0 0">GLOW AI is a product of Telinno Consulting (UK) Limited.</p>
  <p style="margin:6px 0 0">Registered Address: 27 Old Gloucester Street, London, WC1N 3AX, United Kingdom<br>
  Company Number: 13324690<br>
  VAT Registration Number: 436 1060 27</p>
</div>`;

const LEGAL_FOOTER_TEXT = `GLOW AI™ · SEE YOUR GLOW. START YOUR JOURNEY.
GLOW AI is a product of Telinno Consulting (UK) Limited.
Registered Address: 27 Old Gloucester Street, London, WC1N 3AX, United Kingdom
Company Number: 13324690
VAT Registration Number: 436 1060 27`;

const EMAIL_COPY = {
  en: {
    r24: {
      subject:"Your Glow has more to tell you. ✨", preheader:"You’ve seen your Snapshot. Now look a little deeper.",
      title:"Your Glow Snapshot is just the beginning.", hi:"Hi there,", intro:"Yesterday, you received your Glow Snapshot.",
      known:"You now know your Glow Score, Glow Archetype™, and three Glow priorities.",
      heading:"Your three priorities aren’t random.", pattern:"Together, they form a pattern. And that pattern tells a deeper story about your visible Glow profile.",
      eyebrow:"LOOK BEYOND THE SCORE", subheading:"Understand what your results are telling you.",
      body:"Your free Snapshot shows you where to look. The next step is understanding why those priorities surfaced and what they mean.",
      story:"YOUR GLOW STORY", storyText:"The pattern behind your six dimensions.",
      why:"WHY THESE 3 PRIORITIES?", whyText:"Why these areas became your focus.",
      ritual:"YOUR 30-DAY GLOW RITUAL", ritualText:"Turn your priorities into a simple, structured journey.",
      cta:"DISCOVER MY GLOW INSIGHT →", saved:"Your existing results are already saved. No new selfie or analysis required.",
      journeyEyebrow:"YOUR GLOW JOURNEY IS ALREADY UNDERWAY.", journeyTitle:"You don’t need to start again.",
      journeyText:"Your original Glow Check, results and priorities are securely connected.",
      journeyId:"Glow Journey ID:", note:"A NOTE FROM GLOW AI™",
      noteText:"Your Glow results are based on visual analysis of your submitted image and are intended for personal wellness and appearance guidance."
    },
    r72: {
      subject:"Your Glow journey is still waiting. ✨", preheader:"Your results are ready whenever you are.",
      title:"Ready to go a little deeper?", hi:"Hi there,",
      intro:"Your Glow Snapshot™ gave you a first look at your results.",
      known:"You've already discovered your Glow Score, Glow Archetype™, and 3 Glow Priorities™.",
      eyebrow:"YOUR PERSONAL GLOW PLAN™",
      body:"Go beyond the snapshot and explore what your results mean — and how your three priorities fit together.",
      cta:"DISCOVER MY GLOW INSIGHT →", saved:"Your results are already saved.", noNew:"No new selfie. No new analysis.",
      journeyId:"Journey ID:"
    },
    plan: {
      subject:"Your Personal Glow Plan™ is ready. ✨", preheader:"Your deeper Glow insights are ready to explore.",
      title:"Your Glow story goes deeper.", hi:"Hi there,",
      intro:"Thank you for unlocking your Personal Glow Plan™. Your deeper Glow insights are now ready.",
      eyebrow:"YOUR PERSONAL GLOW PLAN™", body:"Your plan brings your Glow Check results together into a more complete picture of your visible Glow profile.",
      story:"01 — YOUR GLOW STORY", storyText:"The pattern behind six Glow dimensions.",
      priorities:"02 — YOUR 3 GLOW PRIORITIES™", prioritiesText:"A deeper look at the areas identified.",
      archetype:"03 — YOUR GLOW ARCHETYPE™", archetypeText:"A fuller interpretation of your overall pattern.",
      ritual:"04 — YOUR 30-DAY GLOW RITUAL™", ritualText:"A simple structure to turn your priorities into a journey.",
      ready:"YOUR PLAN IS READY", cta:"OPEN MY PERSONAL GLOW PLAN →",
      secure:"Your results are securely connected.", journeyId:"Journey ID:", keep:"Keep this email safe.",
      continues:"YOUR GLOW JOURNEY CONTINUES",
      continueText:"Your Personal Glow Plan is not a diagnosis or a promise. It is a personalised starting point for understanding your visible Glow profile and your own journey."
    },
    onboarding: {
      subject:"Your Glow Plan is ready — here’s what to do next. ✨", preheader:"You’ve got the intelligence. Now let’s put it to work.",
      title:"Your Glow Plan is ready. Now let’s put it to work.", hi:"Hi there,",
      intro:"Your Personal Glow Plan is your starting point — not the finish line. The best way to get value from GLOW AI is to take a few simple steps inside your Journey.",
      lead:"You’ve got the intelligence. Now let’s turn it into action.",
      step1:"01 — READ YOUR PERSONAL GLOW REPORT", step1Text:"Read the report fully. Start with your Glow Profile, Glow Archetype™ and your 3 Glow Priorities™ so you understand the story behind your results.",
      step2:"02 — EXPLORE GLOW INTELLIGENCE", step2Text:"Go to Glow Intelligence and discover the tools that help you make more informed decisions based on your personal Glow profile.",
      step3:"03 — REVIEW YOUR GLOW PROFILE", step3Text:"Take a closer look at your six Glow dimensions, your archetype and the priorities that shape your personalised Journey.",
      step4:"04 — BUILD YOUR DIGITAL SHELF", step4Text:"Upload the skincare, beauty and personal-care products you already own. Don’t buy anything yet — show GLOW AI what is already on your shelf.",
      step5:"05 — CHECK YOUR SHELF INTELLIGENCE", step5Text:"Review what your existing products mean for your Glow priorities, where they fit and where you may have gaps.",
      step6:"06 — UNDERSTAND YOUR ROUTINE", step6Text:"Review your personalised routine and understand what to use, when to use it and how each step connects to your Glow priorities.",
      step7:"07 — EXPLORE YOUR WISHLIST", step7Text:"Save products you may want to consider next. Your Wishlist is about informed possibilities — not pressure to buy.",
      cta:"CONTINUE MY GLOW JOURNEY →", closing:"Your Glow Journey starts now. Come back whenever you’re ready and keep building from the intelligence you already have.",
      journeyId:"Glow Journey ID:", note:"A NOTE FROM GLOW AI™", noteText:"Your Glow results are based on visual analysis of your submitted image and are intended for personal wellness and appearance guidance."
    },
    day29: {
      subject:"Your 30-Day Glow Check is almost here. ✨", preheader:"Tomorrow, you’ll see how your Glow profile has changed.",
      title:"Your next Glow Check is almost here.", day30:"Tomorrow marks Day 30.",
      hi:"Hi there,", intro:"It’s almost time to check in on your Glow journey.",
      tomorrow:"Tomorrow marks Day 30.",
      start:"Your original Glow Check created your starting point — your Glow Score, Glow Archetype™, six dimensions and three Glow Priorities™.",
      eyebrow:"DAY 30 IS YOUR CHECK-IN",
      heading:"Your Day-30 Glow Check gives you a new visual assessment that can be viewed alongside your original results.",
      score:"01 — YOUR GLOW SCORE", scoreText:"See your new overall Glow profile.",
      six:"02 — YOUR SIX GLOW DIMENSIONS", sixText:"Review how each dimension compares with your Day-0 assessment.",
      priorities:"03 — YOUR GLOW PRIORITIES™", prioritiesText:"Reconnect with areas that originally shaped your journey.",
      journey:"04 — YOUR GLOW JOURNEY", journeyText:"See Day-0 and Day-30 results together.",
      comeback:"TOMORROW, COME BACK WITH YOUR JOURNEY ID", journeyId:"Journey ID:",
      cta:"START MY DAY-30 GLOW CHECK →", secure:"When ready, use the secure link above to begin your Day-30 Glow Check.",
      tip:"For the most useful comparison, try to take your new photo under conditions similar to your original Glow Check — where practical.",
      lastEyebrow:"ONE MORE LOOK", lastTitle:"Your Day-30 check isn’t about perfection.",
      lastText:"It’s another point in your journey. Your results provide a visual comparison between two assessment points, helping you see what your Glow profile looks like at Day 30."
    }
  },
  fr: {
    r24: {
      subject:"Votre Glow a encore des choses à vous révéler. ✨", preheader:"Vous avez vu votre Snapshot. Il est temps d’aller un peu plus loin.",
      title:"Votre Glow Snapshot n’est que le début.", hi:"Bonjour,", intro:"Hier, vous avez reçu votre Glow Snapshot.",
      known:"Vous connaissez maintenant votre Glow Score, votre Glow Archetype™ et vos trois priorités Glow.",
      heading:"Vos trois priorités ne sont pas le fruit du hasard.", pattern:"Ensemble, elles forment un schéma. Et ce schéma raconte une histoire plus profonde de votre profil Glow visible.",
      eyebrow:"REGARDEZ AU-DELÀ DU SCORE", subheading:"Comprenez ce que vos résultats vous révèlent.",
      body:"Votre Snapshot gratuit vous montre où regarder. L’étape suivante consiste à comprendre pourquoi ces priorités sont apparues et ce qu’elles signifient.",
      story:"VOTRE HISTOIRE GLOW", storyText:"Le schéma qui se dessine à travers vos six dimensions.",
      why:"POURQUOI CES 3 PRIORITÉS ?", whyText:"Pourquoi ces zones sont devenues votre priorité.",
      ritual:"VOTRE RITUEL GLOW DE 30 JOURS", ritualText:"Transformez vos priorités en un parcours simple et structuré.",
      cta:"DÉCOUVRIR MON INSIGHT GLOW →", saved:"Vos résultats existants sont déjà enregistrés. Aucun nouveau selfie ni aucune nouvelle analyse ne sont nécessaires.",
      journeyEyebrow:"VOTRE PARCOURS GLOW EST DÉJÀ EN COURS.", journeyTitle:"Vous n’avez pas besoin de recommencer.",
      journeyText:"Votre Glow Check initial, vos résultats et vos priorités sont liés de manière sécurisée.",
      journeyId:"Glow Journey ID :", note:"UNE NOTE DE GLOW AI™",
      noteText:"Vos résultats Glow reposent sur l’analyse visuelle de l’image envoyée et sont destinés à des conseils personnels de bien-être et d’apparence."
    },
    r72: {
      subject:"Votre parcours Glow vous attend toujours. ✨", preheader:"Vos résultats sont prêts quand vous le serez.",
      title:"Prête à aller un peu plus loin ?", hi:"Bonjour,", intro:"Votre Glow Snapshot™ vous a donné un premier aperçu de vos résultats.",
      known:"Vous avez déjà découvert votre Glow Score, votre Glow Archetype™ et vos 3 priorités Glow™.",
      eyebrow:"VOTRE PERSONAL GLOW PLAN™",
      body:"Allez au-delà du Snapshot et découvrez ce que vos résultats signifient — et comment vos trois priorités s’articulent.",
      cta:"DÉCOUVRIR MON INSIGHT GLOW →", saved:"Vos résultats sont déjà enregistrés.", noNew:"Aucun nouveau selfie. Aucune nouvelle analyse.",
      journeyId:"Journey ID :"
    },
    plan: {
      subject:"Votre Personal Glow Plan™ est prêt. ✨", preheader:"Vos insights Glow approfondis sont prêts à être découverts.",
      title:"Votre histoire Glow va plus loin.", hi:"Bonjour,", intro:"Merci d’avoir débloqué votre Personal Glow Plan™. Vos insights Glow approfondis sont maintenant prêts.",
      eyebrow:"VOTRE PERSONAL GLOW PLAN™", body:"Votre plan rassemble les résultats de votre Glow Check pour offrir une vision plus complète de votre profil Glow visible.",
      story:"01 — VOTRE HISTOIRE GLOW", storyText:"Le schéma qui se dessine à travers vos six dimensions Glow.",
      priorities:"02 — VOS 3 PRIORITÉS GLOW™", prioritiesText:"Un regard plus approfondi sur les zones identifiées.",
      archetype:"03 — VOTRE GLOW ARCHETYPE™", archetypeText:"Une interprétation plus complète de votre profil global.",
      ritual:"04 — VOTRE RITUEL GLOW DE 30 JOURS™", ritualText:"Une structure simple pour transformer vos priorités en parcours.",
      ready:"VOTRE PLAN EST PRÊT", cta:"OUVRIR MON PERSONAL GLOW PLAN →",
      secure:"Vos résultats sont liés de manière sécurisée.", journeyId:"Glow Journey ID :", keep:"Conservez cet e-mail en lieu sûr.",
      continues:"VOTRE PARCOURS GLOW CONTINUE",
      continueText:"Votre Personal Glow Plan n’est ni un diagnostic ni une promesse. C’est un point de départ personnalisé pour comprendre votre profil Glow visible et votre propre parcours."
    },
    day29: {
      subject:"Votre Glow Check de 30 jours approche. ✨", preheader:"Demain, vous verrez comment votre profil Glow a évolué.",
      title:"Votre prochain Glow Check approche.", day30:"Demain marque le jour 30.",
      hi:"Bonjour,", intro:"Il est presque temps de faire le point sur votre parcours Glow.",
      tomorrow:"Demain marque le jour 30.",
      start:"Votre Glow Check initial a créé votre point de départ — votre Glow Score, votre Glow Archetype™, vos six dimensions et vos trois priorités Glow™.",
      eyebrow:"LE JOUR 30 EST VOTRE POINT D’ÉTAPE",
      heading:"Votre Glow Check du jour 30 vous offre une nouvelle évaluation visuelle que vous pourrez consulter à côté de vos résultats initiaux.",
      score:"01 — VOTRE GLOW SCORE", scoreText:"Découvrez votre nouveau profil Glow global.",
      six:"02 — VOS SIX DIMENSIONS GLOW", sixText:"Comparez chaque dimension avec votre évaluation du jour 0.",
      priorities:"03 — VOS PRIORITÉS GLOW™", prioritiesText:"Retrouvez les zones qui ont initialement façonné votre parcours.",
      journey:"04 — VOTRE PARCOURS GLOW", journeyText:"Visualisez ensemble les résultats du jour 0 et du jour 30.",
      comeback:"DEMAIN, REVENEZ AVEC VOTRE JOURNEY ID", journeyId:"Journey ID :",
      cta:"COMMENCER MON GLOW CHECK DU JOUR 30 →", secure:"Lorsque vous êtes prête, utilisez le lien sécurisé ci-dessus pour commencer votre Glow Check du jour 30.",
      tip:"Pour une comparaison plus utile, essayez de prendre votre nouvelle photo dans des conditions similaires à celles de votre Glow Check initial — lorsque cela est possible.",
      lastEyebrow:"UN DERNIER REGARD", lastTitle:"Votre check du jour 30 n’est pas une question de perfection.",
      lastText:"C’est un nouveau point de votre parcours. Vos résultats offrent une comparaison visuelle entre deux évaluations, afin de vous aider à voir à quoi ressemble votre profil Glow au jour 30."
    }
  },
  es: {
    r24: {
      subject:"Tu Glow todavía tiene más que contarte. ✨", preheader:"Ya has visto tu Snapshot. Ahora mira un poco más allá.",
      title:"Tu Glow Snapshot es solo el principio.", hi:"Hola,", intro:"Ayer recibiste tu Glow Snapshot.",
      known:"Ahora conoces tu Glow Score, tu Glow Archetype™ y tus tres prioridades Glow.",
      heading:"Tus tres prioridades no son aleatorias.", pattern:"Juntas forman un patrón. Y ese patrón cuenta una historia más profunda sobre tu perfil Glow visible.",
      eyebrow:"MIRA MÁS ALLÁ DE LA PUNTUACIÓN", subheading:"Entiende lo que tus resultados te están contando.",
      body:"Tu Snapshot gratuito te muestra dónde mirar. El siguiente paso es entender por qué aparecieron esas prioridades y qué significan.",
      story:"TU HISTORIA GLOW", storyText:"El patrón que hay detrás de tus seis dimensiones.",
      why:"¿POR QUÉ ESTAS 3 PRIORIDADES?", whyText:"Por qué estas áreas se convirtieron en tu foco.",
      ritual:"TU RITUAL GLOW DE 30 DÍAS", ritualText:"Convierte tus prioridades en un recorrido sencillo y estructurado.",
      cta:"DESCUBRIR MI INSIGHT GLOW →", saved:"Tus resultados existentes ya están guardados. No necesitas un nuevo selfie ni un nuevo análisis.",
      journeyEyebrow:"TU RECORRIDO GLOW YA ESTÁ EN MARCHA.", journeyTitle:"No necesitas empezar de nuevo.",
      journeyText:"Tu Glow Check original, tus resultados y tus prioridades están vinculados de forma segura.",
      journeyId:"Glow Journey ID:", note:"UNA NOTA DE GLOW AI™",
      noteText:"Tus resultados Glow se basan en el análisis visual de la imagen enviada y están pensados para orientación personal sobre bienestar y apariencia."
    },
    r72: {
      subject:"Tu recorrido Glow todavía te está esperando. ✨", preheader:"Tus resultados están listos cuando tú lo estés.",
      title:"¿Listo para profundizar un poco más?", hi:"Hola,", intro:"Tu Glow Snapshot™ te dio una primera visión de tus resultados.",
      known:"Ya has descubierto tu Glow Score, tu Glow Archetype™ y tus 3 Glow Priorities™.",
      eyebrow:"TU PERSONAL GLOW PLAN™",
      body:"Ve más allá del Snapshot y descubre qué significan tus resultados y cómo encajan tus tres prioridades.",
      cta:"DESCUBRIR MI INSIGHT GLOW →", saved:"Tus resultados ya están guardados.", noNew:"No necesitas un nuevo selfie. No necesitas un nuevo análisis.",
      journeyId:"Journey ID:"
    },
    plan: {
      subject:"Tu Personal Glow Plan™ está listo. ✨", preheader:"Tus insights Glow más profundos están listos para descubrirlos.",
      title:"Tu historia Glow va más allá.", hi:"Hola,", intro:"Gracias por desbloquear tu Personal Glow Plan™. Tus insights Glow más profundos ya están listos.",
      eyebrow:"TU PERSONAL GLOW PLAN™", body:"Tu plan reúne los resultados de tu Glow Check para ofrecer una visión más completa de tu perfil Glow visible.",
      story:"01 — TU HISTORIA GLOW", storyText:"El patrón que hay detrás de tus seis dimensiones Glow.",
      priorities:"02 — TUS 3 GLOW PRIORITIES™", prioritiesText:"Una mirada más profunda a las áreas identificadas.",
      archetype:"03 — TU GLOW ARCHETYPE™", archetypeText:"Una interpretación más completa de tu patrón general.",
      ritual:"04 — TU RITUAL GLOW DE 30 DÍAS™", ritualText:"Una estructura sencilla para convertir tus prioridades en un recorrido.",
      ready:"TU PLAN ESTÁ LISTO", cta:"ABRIR MI PERSONAL GLOW PLAN →",
      secure:"Tus resultados están vinculados de forma segura.", journeyId:"Glow Journey ID:", keep:"Guarda este email en un lugar seguro.",
      continues:"TU RECORRIDO GLOW CONTINÚA",
      continueText:"Tu Personal Glow Plan no es un diagnóstico ni una promesa. Es un punto de partida personalizado para comprender tu perfil Glow visible y tu propio recorrido."
    },
    day29: {
      subject:"Tu Glow Check de 30 días está cerca. ✨", preheader:"Mañana verás cómo ha cambiado tu perfil Glow.",
      title:"Tu próximo Glow Check está cerca.", day30:"Mañana es el día 30.",
      hi:"Hola,", intro:"Ya casi es hora de revisar tu recorrido Glow.",
      tomorrow:"Mañana es el día 30.",
      start:"Tu Glow Check original creó tu punto de partida — tu Glow Score, tu Glow Archetype™, seis dimensiones y tres Glow Priorities™.",
      eyebrow:"EL DÍA 30 ES TU PUNTO DE CONTROL",
      heading:"Tu Glow Check del día 30 te ofrece una nueva evaluación visual que podrás consultar junto a tus resultados originales.",
      score:"01 — TU GLOW SCORE", scoreText:"Consulta tu nuevo perfil Glow general.",
      six:"02 — TUS SEIS DIMENSIONES GLOW", sixText:"Compara cada dimensión con tu evaluación del día 0.",
      priorities:"03 — TUS GLOW PRIORITIES™", prioritiesText:"Vuelve a las áreas que dieron forma a tu recorrido inicialmente.",
      journey:"04 — TU RECORRIDO GLOW", journeyText:"Consulta juntos los resultados del día 0 y del día 30.",
      comeback:"MAÑANA, VUELVE CON TU JOURNEY ID", journeyId:"Journey ID:",
      cta:"EMPEZAR MI GLOW CHECK DEL DÍA 30 →", secure:"Cuando estés listo, utiliza el enlace seguro de arriba para comenzar tu Glow Check del día 30.",
      tip:"Para una comparación más útil, intenta tomar tu nueva foto en condiciones similares a las de tu Glow Check original — cuando sea posible.",
      lastEyebrow:"UNA ÚLTIMA MIRADA", lastTitle:"Tu check del día 30 no trata de la perfección.",
      lastText:"Es otro punto de tu recorrido. Tus resultados ofrecen una comparación visual entre dos evaluaciones, ayudándote a ver cómo es tu perfil Glow en el día 30."
    }
  },
  pt: {
    r24: {
      subject:"O seu Glow ainda tem mais para lhe contar. ✨", preheader:"Já viu o seu Snapshot. Agora, olhe um pouco mais fundo.",
      title:"O seu Glow Snapshot é apenas o começo.", hi:"Olá,", intro:"Ontem, recebeu o seu Glow Snapshot.",
      known:"Agora conhece o seu Glow Score, o seu Glow Archetype™ e as suas três prioridades Glow.",
      heading:"As suas três prioridades não são aleatórias.", pattern:"Juntas, formam um padrão. E esse padrão conta uma história mais profunda sobre o seu perfil Glow visível.",
      eyebrow:"OLHE ALÉM DO SCORE", subheading:"Perceba o que os seus resultados estão a dizer.",
      body:"O seu Snapshot gratuito mostra-lhe onde olhar. O passo seguinte é compreender porque surgiram essas prioridades e o que significam.",
      story:"A SUA HISTÓRIA GLOW", storyText:"O padrão por detrás das suas seis dimensões.",
      why:"PORQUE ESTAS 3 PRIORIDADES?", whyText:"Porque estas áreas se tornaram o seu foco.",
      ritual:"O SEU RITUAL GLOW DE 30 DIAS", ritualText:"Transforme as suas prioridades numa jornada simples e estruturada.",
      cta:"DESCOBRIR O MEU INSIGHT GLOW →", saved:"Os seus resultados existentes já estão guardados. Não é necessária uma nova selfie nem uma nova análise.",
      journeyEyebrow:"A SUA JORNADA GLOW JÁ ESTÁ EM CURSO.", journeyTitle:"Não precisa de começar de novo.",
      journeyText:"O seu Glow Check original, os resultados e as prioridades estão ligados de forma segura.",
      journeyId:"Glow Journey ID:", note:"UMA NOTA DA GLOW AI™",
      noteText:"Os seus resultados Glow baseiam-se na análise visual da imagem enviada e destinam-se a orientação pessoal de bem-estar e aparência."
    },
    r72: {
      subject:"A sua jornada Glow continua à sua espera. ✨", preheader:"Os seus resultados estão prontos quando estiver.",
      title:"Pronto para ir um pouco mais fundo?", hi:"Olá,", intro:"O seu Glow Snapshot™ deu-lhe uma primeira visão dos seus resultados.",
      known:"Já descobriu o seu Glow Score, o seu Glow Archetype™ e as suas 3 Glow Priorities™.",
      eyebrow:"O SEU PERSONAL GLOW PLAN™",
      body:"Vá além do Snapshot e descubra o que os seus resultados significam — e como as suas três prioridades se ligam.",
      cta:"DESCOBRIR O MEU INSIGHT GLOW →", saved:"Os seus resultados já estão guardados.", noNew:"Não é necessária uma nova selfie. Não é necessária uma nova análise.",
      journeyId:"Journey ID:"
    },
    plan: {
      subject:"O seu Personal Glow Plan™ está pronto. ✨", preheader:"Os seus insights Glow mais profundos estão prontos para explorar.",
      title:"A sua história Glow vai mais fundo.", hi:"Olá,", intro:"Obrigado por desbloquear o seu Personal Glow Plan™. Os seus insights Glow mais profundos estão agora prontos.",
      eyebrow:"O SEU PERSONAL GLOW PLAN™", body:"O seu plano reúne os resultados do seu Glow Check numa visão mais completa do seu perfil Glow visível.",
      story:"01 — A SUA HISTÓRIA GLOW", storyText:"O padrão por detrás das seis dimensões Glow.",
      priorities:"02 — AS SUAS 3 PRIORIDADES GLOW™", prioritiesText:"Uma análise mais profunda das áreas identificadas.",
      archetype:"03 — O SEU GLOW ARCHETYPE™", archetypeText:"Uma interpretação mais completa do seu padrão geral.",
      ritual:"04 — O SEU RITUAL GLOW DE 30 DIAS™", ritualText:"Uma estrutura simples para transformar as suas prioridades numa jornada.",
      ready:"O SEU PLANO ESTÁ PRONTO", cta:"ABRIR O MEU PERSONAL GLOW PLAN →",
      secure:"Os seus resultados estão ligados de forma segura.", journeyId:"Glow Journey ID:", keep:"Guarde este email num local seguro.",
      continues:"A SUA JORNADA GLOW CONTINUA",
      continueText:"O seu Personal Glow Plan não é um diagnóstico nem uma promessa. É um ponto de partida personalizado para compreender o seu perfil Glow visível e a sua própria jornada."
    },
    day29: {
      subject:"O seu Glow Check de 30 dias está quase a chegar. ✨", preheader:"Amanhã verá como o seu perfil Glow mudou.",
      title:"O seu próximo Glow Check está quase a chegar.", day30:"Amanhã será o dia 30.",
      hi:"Olá,", intro:"Está quase na altura de fazer o ponto da sua jornada Glow.",
      tomorrow:"Amanhã será o dia 30.",
      start:"O seu Glow Check original criou o seu ponto de partida — o seu Glow Score, Glow Archetype™, seis dimensões e três Glow Priorities™.",
      eyebrow:"O DIA 30 É O SEU CHECK-IN",
      heading:"O seu Glow Check do dia 30 oferece uma nova avaliação visual que pode ser vista juntamente com os seus resultados originais.",
      score:"01 — O SEU GLOW SCORE", scoreText:"Veja o seu novo perfil Glow geral.",
      six:"02 — AS SUAS SEIS DIMENSÕES GLOW", sixText:"Compare cada dimensão com a sua avaliação do dia 0.",
      priorities:"03 — AS SUAS GLOW PRIORITIES™", prioritiesText:"Reveja as áreas que inicialmente orientaram a sua jornada.",
      journey:"04 — A SUA JORNADA GLOW", journeyText:"Veja os resultados do dia 0 e do dia 30 em conjunto.",
      comeback:"AMANHÃ, VOLTE COM O SEU JOURNEY ID", journeyId:"Journey ID:",
      cta:"COMEÇAR O MEU GLOW CHECK DO DIA 30 →", secure:"Quando estiver pronto, use o link seguro acima para iniciar o seu Glow Check do dia 30.",
      tip:"Para uma comparação mais útil, tente tirar a nova fotografia em condições semelhantes às do seu Glow Check original — quando possível.",
      lastEyebrow:"MAIS UM OLHAR", lastTitle:"O seu check do dia 30 não é sobre perfeição.",
      lastText:"É mais um ponto na sua jornada. Os seus resultados proporcionam uma comparação visual entre dois momentos de avaliação, ajudando-o a ver como é o seu perfil Glow no dia 30."
    }
  }
};
EMAIL_COPY.de={
r24:{...EMAIL_COPY.en.r24,subject:"Ihr Glow hat noch mehr zu erzählen. ✨",preheader:"Sie haben Ihren Snapshot gesehen. Jetzt geht es etwas tiefer."},
r72:{...EMAIL_COPY.en.r72,subject:"Ihre Glow Journey wartet noch auf Sie. ✨",preheader:"Ihre Ergebnisse sind bereit, wann immer Sie es sind."},
plan:{...EMAIL_COPY.en.plan,subject:"Ihr Personal Glow Plan™ ist bereit. ✨",preheader:"Ihre tieferen Glow-Insights warten darauf, entdeckt zu werden."},
day29:{...EMAIL_COPY.en.day29,subject:"Ihr 30-Tage-Glow Check ist fast da. ✨",preheader:"Morgen sehen Sie, wie sich Ihr Glow-Profil verändert hat."}
};
EMAIL_COPY.it={
r24:{...EMAIL_COPY.en.r24,subject:"Il tuo Glow ha ancora qualcosa da raccontarti. ✨",preheader:"Hai visto il tuo Snapshot. Ora guarda un po’ più in profondità."},
r72:{...EMAIL_COPY.en.r72,subject:"Il tuo Glow Journey ti sta ancora aspettando. ✨",preheader:"I tuoi risultati sono pronti quando lo sei tu."},
plan:{...EMAIL_COPY.en.plan,subject:"Il tuo Personal Glow Plan™ è pronto. ✨",preheader:"I tuoi insight Glow più profondi sono pronti."},
day29:{...EMAIL_COPY.en.day29,subject:"Il tuo Glow Check di 30 giorni è quasi qui. ✨",preheader:"Domani vedrai come è cambiato il tuo profilo Glow."}
};
EMAIL_COPY.de={
r24:{...EMAIL_COPY.en.r24,subject:"Ihr Glow hat noch mehr zu erzählen. ✨",preheader:"Sie haben Ihren Snapshot gesehen. Jetzt geht es etwas tiefer.",title:"Ihr Glow Snapshot ist erst der Anfang.",hi:"Hallo,",intro:"Gestern haben Sie Ihren Glow Snapshot erhalten.",known:"Sie kennen jetzt Ihren Glow Score, Glow Archetype™ und Ihre drei Glow-Prioritäten.",heading:"Ihre drei Prioritäten sind nicht zufällig.",pattern:"Gemeinsam bilden sie ein Muster. Dieses Muster erzählt eine tiefere Geschichte über Ihr sichtbares Glow-Profil.",eyebrow:"BLICKEN SIE ÜBER DEN SCORE HINAUS",subheading:"Verstehen Sie, was Ihre Ergebnisse aussagen.",body:"Ihr kostenloser Snapshot zeigt, wo Sie hinschauen können. Der nächste Schritt ist zu verstehen, warum diese Prioritäten aufgetaucht sind und was sie bedeuten.",story:"IHRE GLOW-GESCHICHTE",storyText:"Das Muster hinter Ihren sechs Dimensionen.",why:"WARUM DIESE 3 PRIORITÄTEN?",whyText:"Warum diese Bereiche zu Ihrem Fokus wurden.",ritual:"IHR 30-TAGE-GLOW-RITUAL",ritualText:"Verwandeln Sie Ihre Prioritäten in eine einfache, strukturierte Journey.",cta:"MEINEN GLOW INSIGHT ENTDECKEN →",saved:"Ihre vorhandenen Ergebnisse sind bereits gespeichert. Kein neues Selfie und keine neue Analyse erforderlich.",journeyEyebrow:"IHRE GLOW JOURNEY LÄUFT BEREITS.",journeyTitle:"Sie müssen nicht neu beginnen.",journeyText:"Ihr ursprünglicher Glow Check, Ihre Ergebnisse und Prioritäten sind sicher verbunden.",journeyId:"Glow Journey ID:",note:"EINE NOTIZ VON GLOW AI™",noteText:"Ihre Glow-Ergebnisse basieren auf der visuellen Analyse Ihres eingereichten Bildes und dienen der persönlichen Orientierung zu Wellness und Erscheinungsbild."},
r72:{...EMAIL_COPY.en.r72,subject:"Ihre Glow Journey wartet noch auf Sie. ✨",preheader:"Ihre Ergebnisse sind bereit, wann immer Sie es sind.",title:"Bereit, etwas tiefer zu gehen?",hi:"Hallo,",intro:"Ihr Glow Snapshot™ hat Ihnen einen ersten Blick auf Ihre Ergebnisse gegeben.",known:"Sie haben bereits Ihren Glow Score, Glow Archetype™ und Ihre 3 Glow Priorities™ entdeckt.",eyebrow:"IHR PERSONAL GLOW PLAN™",body:"Gehen Sie über den Snapshot hinaus und entdecken Sie, was Ihre Ergebnisse bedeuten und wie Ihre drei Prioritäten zusammenpassen.",cta:"MEINEN GLOW INSIGHT ENTDECKEN →",saved:"Ihre Ergebnisse sind bereits gespeichert.",noNew:"Kein neues Selfie. Keine neue Analyse.",journeyId:"Journey ID:"},
plan:{...EMAIL_COPY.en.plan,subject:"Ihr Personal Glow Plan™ ist bereit. ✨",preheader:"Ihre tieferen Glow-Insights warten darauf, entdeckt zu werden.",title:"Ihre Glow-Geschichte geht tiefer.",hi:"Hallo,",intro:"Danke, dass Sie Ihren Personal Glow Plan™ freigeschaltet haben. Ihre tieferen Glow-Insights sind jetzt bereit.",eyebrow:"IHR PERSONAL GLOW PLAN™",body:"Ihr Plan verbindet die Ergebnisse Ihres Glow Checks zu einem umfassenderen Bild Ihres sichtbaren Glow-Profils.",story:"01 — IHRE GLOW-GESCHICHTE",storyText:"Das Muster hinter sechs Glow-Dimensionen.",priorities:"02 — IHRE 3 GLOW-PRIORITÄTEN™",prioritiesText:"Ein tieferer Blick auf die identifizierten Bereiche.",archetype:"03 — IHR GLOW ARCHETYPE™",archetypeText:"Eine umfassendere Interpretation Ihres Gesamtmusters.",ritual:"04 — IHR 30-TAGE-GLOW-RITUAL™",ritualText:"Eine einfache Struktur, um Ihre Prioritäten in eine Journey zu verwandeln.",ready:"IHR PLAN IST BEREIT",cta:"MEINEN PERSONAL GLOW PLAN ÖFFNEN →",secure:"Ihre Ergebnisse sind sicher verbunden.",journeyId:"Journey ID:",keep:"Bewahren Sie diese E-Mail sicher auf.",continues:"IHRE GLOW JOURNEY GEHT WEITER",continueText:"Ihr Personal Glow Plan ist keine Diagnose und kein Versprechen. Er ist ein personalisierter Ausgangspunkt zum Verständnis Ihres sichtbaren Glow-Profils und Ihrer eigenen Journey."},
day29:{...EMAIL_COPY.en.day29,subject:"Ihr 30-Tage-Glow Check ist fast da. ✨",preheader:"Morgen sehen Sie, wie sich Ihr Glow-Profil verändert hat.",title:"Ihr nächster Glow Check ist fast da.",day30:"Morgen ist Tag 30.",hi:"Hallo,",intro:"Es ist fast Zeit, bei Ihrer Glow Journey einzuchecken.",tomorrow:"Morgen ist Tag 30.",start:"Ihr ursprünglicher Glow Check hat Ihren Ausgangspunkt erstellt – Glow Score, Glow Archetype™, sechs Dimensionen und drei Glow Priorities™.",eyebrow:"TAG 30 IST IHR CHECK-IN",heading:"Ihr Day-30 Glow Check liefert eine neue visuelle Bewertung, die Sie neben Ihren ursprünglichen Ergebnissen betrachten können.",score:"01 — IHR GLOW SCORE",scoreText:"Sehen Sie Ihr neues Gesamtprofil.",six:"02 — IHRE SECHS GLOW-DIMENSIONEN",sixText:"Vergleichen Sie jede Dimension mit Ihrer Bewertung an Tag 0.",priorities:"03 — IHRE GLOW PRIORITIES™",prioritiesText:"Kehren Sie zu den Bereichen zurück, die Ihre Journey ursprünglich geprägt haben.",journey:"04 — IHRE GLOW JOURNEY",journeyText:"Sehen Sie Tag-0- und Tag-30-Ergebnisse gemeinsam.",comeback:"MORGEN MIT IHRER JOURNEY ID ZURÜCKKEHREN",journeyId:"Journey ID:",cta:"MEINEN DAY-30-GLOW CHECK STARTEN →",secure:"Wenn Sie bereit sind, verwenden Sie den sicheren Link oben, um Ihren Day-30 Glow Check zu starten.",tip:"Für einen möglichst nützlichen Vergleich sollten Sie Ihr neues Foto möglichst unter ähnlichen Bedingungen wie beim ursprünglichen Glow Check aufnehmen.",lastEyebrow:"EIN LETZTER BLICK",lastTitle:"Beim Day-30 Check geht es nicht um Perfektion.",lastText:"Es ist ein weiterer Punkt Ihrer Journey. Ihre Ergebnisse bieten einen visuellen Vergleich zwischen zwei Bewertungszeitpunkten und helfen Ihnen zu sehen, wie Ihr Glow-Profil an Tag 30 aussieht."}
};
EMAIL_COPY.it={
r24:{...EMAIL_COPY.en.r24,subject:"Il tuo Glow ha ancora qualcosa da raccontarti. ✨",preheader:"Hai visto il tuo Snapshot. Ora guarda un po’ più in profondità.",title:"Il tuo Glow Snapshot è solo l’inizio.",hi:"Ciao,",intro:"Ieri hai ricevuto il tuo Glow Snapshot.",known:"Ora conosci il tuo Glow Score, Glow Archetype™ e le tre priorità Glow.",heading:"Le tue tre priorità non sono casuali.",pattern:"Insieme formano un pattern. E quel pattern racconta una storia più profonda sul tuo profilo Glow visibile.",eyebrow:"OLTRE IL PUNTEGGIO",subheading:"Comprendi cosa raccontano i tuoi risultati.",body:"Il tuo Snapshot gratuito mostra dove guardare. Il passo successivo è capire perché sono emerse queste priorità e cosa significano.",story:"LA TUA STORIA GLOW",storyText:"Il pattern dietro le tue sei dimensioni.",why:"PERCHÉ QUESTE 3 PRIORITÀ?",whyText:"Perché queste aree sono diventate il tuo focus.",ritual:"IL TUO RITUALE GLOW DI 30 GIORNI",ritualText:"Trasforma le tue priorità in un percorso semplice e strutturato.",cta:"SCOPRI IL MIO GLOW INSIGHT →",saved:"I tuoi risultati esistenti sono già salvati. Nessun nuovo selfie o analisi richiesta.",journeyEyebrow:"IL TUO GLOW JOURNEY È GIÀ IN CORSO.",journeyTitle:"Non devi ricominciare.",journeyText:"Il tuo Glow Check originale, i risultati e le priorità sono collegati in modo sicuro.",journeyId:"Glow Journey ID:",note:"UNA NOTA DA GLOW AI™",noteText:"I tuoi risultati Glow si basano sull’analisi visiva dell’immagine inviata e sono pensati per una guida personale su benessere e aspetto."},
r72:{...EMAIL_COPY.en.r72,subject:"Il tuo Glow Journey ti sta ancora aspettando. ✨",preheader:"I tuoi risultati sono pronti quando lo sei tu.",title:"Pronto ad andare un po’ più in profondità?",hi:"Ciao,",intro:"Il tuo Glow Snapshot™ ti ha dato una prima visione dei risultati.",known:"Hai già scoperto Glow Score, Glow Archetype™ e le 3 Glow Priorities™.",eyebrow:"IL TUO PERSONAL GLOW PLAN™",body:"Vai oltre lo snapshot e scopri cosa significano i tuoi risultati e come si collegano le tre priorità.",cta:"SCOPRI IL MIO GLOW INSIGHT →",saved:"I tuoi risultati sono già salvati.",noNew:"Nessun nuovo selfie. Nessuna nuova analisi.",journeyId:"Journey ID:"},
plan:{...EMAIL_COPY.en.plan,subject:"Il tuo Personal Glow Plan™ è pronto. ✨",preheader:"I tuoi insight Glow più profondi sono pronti.",title:"La tua storia Glow va più in profondità.",hi:"Ciao,",intro:"Grazie per aver sbloccato il tuo Personal Glow Plan™. I tuoi insight Glow più profondi sono ora pronti.",eyebrow:"IL TUO PERSONAL GLOW PLAN™",body:"Il tuo piano riunisce i risultati del Glow Check in un quadro più completo del tuo profilo Glow visibile.",story:"01 — LA TUA STORIA GLOW",storyText:"Il pattern dietro le sei dimensioni Glow.",priorities:"02 — LE TUE 3 GLOW PRIORITIES™",prioritiesText:"Uno sguardo più profondo alle aree identificate.",archetype:"03 — IL TUO GLOW ARCHETYPE™",archetypeText:"Un’interpretazione più completa del tuo pattern generale.",ritual:"04 — IL TUO RITUALE GLOW DI 30 GIORNI™",ritualText:"Una struttura semplice per trasformare le priorità in un percorso.",ready:"IL TUO PIANO È PRONTO",cta:"APRI IL MIO PERSONAL GLOW PLAN →",secure:"I tuoi risultati sono collegati in modo sicuro.",journeyId:"Journey ID:",keep:"Conserva questa email.",continues:"IL TUO GLOW JOURNEY CONTINUA",continueText:"Il Personal Glow Plan non è una diagnosi né una promessa. È un punto di partenza personalizzato per comprendere il tuo profilo Glow visibile e il tuo percorso."},
day29:{...EMAIL_COPY.en.day29,subject:"Il tuo Glow Check di 30 giorni è quasi qui. ✨",preheader:"Domani vedrai come è cambiato il tuo profilo Glow.",title:"Il tuo prossimo Glow Check è quasi qui.",day30:"Domani è il giorno 30.",hi:"Ciao,",intro:"È quasi il momento di fare il check-in del tuo Glow Journey.",tomorrow:"Domani è il giorno 30.",start:"Il tuo Glow Check originale ha creato il punto di partenza — Glow Score, Glow Archetype™, sei dimensioni e tre Glow Priorities™.",eyebrow:"IL GIORNO 30 È IL TUO CHECK-IN",heading:"Il Glow Check del giorno 30 offre una nuova valutazione visiva da vedere accanto ai risultati originali.",score:"01 — IL TUO GLOW SCORE",scoreText:"Scopri il tuo nuovo profilo Glow generale.",six:"02 — LE TUE SEI DIMENSIONI GLOW",sixText:"Confronta ogni dimensione con la valutazione del giorno 0.",priorities:"03 — LE TUE GLOW PRIORITIES™",prioritiesText:"Ritrova le aree che hanno dato forma al tuo percorso.",journey:"04 — IL TUO GLOW JOURNEY",journeyText:"Vedi insieme i risultati del giorno 0 e del giorno 30.",comeback:"DOMANI, TORNA CON LA TUA JOURNEY ID",journeyId:"Journey ID:",cta:"INIZIA IL MIO GLOW CHECK DEL GIORNO 30 →",secure:"Quando sei pronto, usa il link sicuro sopra per iniziare il Glow Check del giorno 30.",tip:"Per un confronto più utile, prova a scattare la nuova foto in condizioni simili al Glow Check originale, quando possibile.",lastEyebrow:"UN’ULTIMA OCCHIATA",lastTitle:"Il check del giorno 30 non riguarda la perfezione.",lastText:"È un altro punto del tuo percorso. I risultati offrono un confronto visivo tra due momenti di valutazione e aiutano a vedere com’è il tuo profilo Glow al giorno 30."}
};
EMAIL_COPY.fr.onboarding={"subject":"Votre Glow Plan est prêt — voici la suite. ✨","preheader":"Vous avez les insights. Il est temps de les mettre en pratique.","title":"Votre Glow Plan est prêt. Passons à l’action.","hi":"Bonjour,","intro":"Votre Personal Glow Plan est votre point de départ — pas la ligne d’arrivée. Pour tirer le meilleur parti de GLOW AI, suivez quelques étapes simples dans votre Journey.","lead":"Vous avez les insights. Transformons-les en actions.","step1":"01 — LISEZ VOTRE RAPPORT PERSONAL GLOW","step1Text":"Lisez entièrement votre rapport. Commencez par votre profil Glow, votre Glow Archetype™ et vos 3 priorités Glow™ pour comprendre l’histoire derrière vos résultats.","step2":"02 — EXPLOREZ GLOW INTELLIGENCE","step2Text":"Accédez à Glow Intelligence et découvrez les outils qui vous aident à prendre des décisions plus éclairées à partir de votre profil Glow personnel.","step3":"03 — CONSULTEZ VOTRE PROFIL GLOW","step3Text":"Examinez vos six dimensions Glow, votre archetype et les priorités qui structurent votre parcours personnalisé.","step4":"04 — CRÉEZ VOTRE ÉTAGÈRE NUMÉRIQUE","step4Text":"Ajoutez les produits de soin, beauté et bien-être que vous possédez déjà. N’achetez rien pour l’instant — montrez à GLOW AI ce qui se trouve déjà sur votre étagère.","step5":"05 — CONSULTEZ L’INTELLIGENCE DE VOTRE ÉTAGÈRE","step5Text":"Découvrez ce que vos produits existants signifient pour vos priorités Glow, où ils s’intègrent et où des lacunes peuvent exister.","step6":"06 — COMPRENEZ VOTRE ROUTINE","step6Text":"Consultez votre routine personnalisée et comprenez quoi utiliser, quand et comment chaque étape se relie à vos priorités Glow.","step7":"07 — EXPLOREZ VOTRE WISHLIST","step7Text":"Enregistrez les produits que vous pourriez envisager ensuite. Votre Wishlist sert à explorer des possibilités en connaissance de cause — pas à vous pousser à acheter.","cta":"CONTINUER MON PARCOURS GLOW →","closing":"Votre Glow Journey commence maintenant. Revenez quand vous le souhaitez et continuez à partir des insights que vous avez déjà.","journeyId":"Glow Journey ID :","note":"UNE NOTE DE GLOW AI™","noteText":"Vos résultats Glow reposent sur l’analyse visuelle de votre image et sont destinés à des conseils personnels de bien-être et d’apparence."};
EMAIL_COPY.es.onboarding={"subject":"Tu Glow Plan está listo — esto es lo siguiente. ✨","preheader":"Tienes la inteligencia. Ahora vamos a ponerla en práctica.","title":"Tu Glow Plan está listo. Ahora vamos a ponerlo en práctica.","hi":"Hola,","intro":"Tu Personal Glow Plan es tu punto de partida — no la meta final. Para sacar el máximo partido a GLOW AI, sigue unos sencillos pasos dentro de tu Journey.","lead":"Tienes la inteligencia. Ahora vamos a convertirla en acción.","step1":"01 — LEE TU INFORME PERSONAL GLOW","step1Text":"Lee el informe completo. Empieza por tu Glow Profile, Glow Archetype™ y tus 3 Glow Priorities™ para entender la historia detrás de tus resultados.","step2":"02 — EXPLORA GLOW INTELLIGENCE","step2Text":"Ve a Glow Intelligence y descubre las herramientas que te ayudan a tomar decisiones más informadas según tu perfil Glow personal.","step3":"03 — REVISA TU PERFIL GLOW","step3Text":"Observa tus seis dimensiones Glow, tu archetype y las prioridades que dan forma a tu Journey personalizado.","step4":"04 — CREA TU ESTANTERÍA DIGITAL","step4Text":"Añade los productos de cuidado, belleza y cuidado personal que ya tienes. No compres nada todavía — muestra a GLOW AI lo que ya hay en tu estantería.","step5":"05 — REVISA LA INTELIGENCIA DE TU ESTANTERÍA","step5Text":"Descubre qué significan tus productos actuales para tus prioridades Glow, dónde encajan y dónde pueden existir carencias.","step6":"06 — ENTIENDE TU RUTINA","step6Text":"Revisa tu rutina personalizada y entiende qué usar, cuándo usarlo y cómo cada paso se conecta con tus prioridades Glow.","step7":"07 — EXPLORA TU WISHLIST","step7Text":"Guarda productos que podrías considerar más adelante. Tu Wishlist sirve para explorar posibilidades con información — no para presionarte a comprar.","cta":"CONTINUAR MI RECORRIDO GLOW →","closing":"Tu Glow Journey empieza ahora. Vuelve cuando quieras y sigue construyendo a partir de la inteligencia que ya tienes.","journeyId":"Glow Journey ID:","note":"UNA NOTA DE GLOW AI™","noteText":"Tus resultados Glow se basan en el análisis visual de tu imagen enviada y están pensados para orientación personal sobre bienestar y apariencia."};
EMAIL_COPY.pt.onboarding={"subject":"O seu Glow Plan está pronto — veja o que fazer a seguir. ✨","preheader":"Tem a inteligência. Agora vamos colocá-la em prática.","title":"O seu Glow Plan está pronto. Agora vamos colocá-lo em prática.","hi":"Olá,","intro":"O seu Personal Glow Plan é o seu ponto de partida — não a linha de chegada. Para tirar o melhor partido do GLOW AI, siga alguns passos simples na sua Journey.","lead":"Tem a inteligência. Agora vamos transformá-la em ação.","step1":"01 — LEIA O SEU RELATÓRIO PERSONAL GLOW","step1Text":"Leia o relatório completo. Comece pelo seu Glow Profile, Glow Archetype™ e pelas suas 3 Glow Priorities™ para compreender a história por trás dos resultados.","step2":"02 — EXPLORE O GLOW INTELLIGENCE","step2Text":"Aceda ao Glow Intelligence e descubra as ferramentas que ajudam a tomar decisões mais informadas com base no seu perfil Glow.","step3":"03 — REVEJA O SEU PERFIL GLOW","step3Text":"Veja as suas seis dimensões Glow, o seu archetype e as prioridades que moldam a sua Journey personalizada.","step4":"04 — CRIE A SUA PRATELEIRA DIGITAL","step4Text":"Adicione os produtos de cuidado, beleza e uso pessoal que já possui. Não compre nada ainda — mostre ao GLOW AI o que já tem na sua prateleira.","step5":"05 — CONSULTE A INTELIGÊNCIA DA SUA PRATELEIRA","step5Text":"Veja o que os seus produtos atuais significam para as suas prioridades Glow, onde se encaixam e onde podem existir lacunas.","step6":"06 — COMPREENDA A SUA ROTINA","step6Text":"Reveja a sua rotina personalizada e compreenda o que usar, quando usar e como cada passo se liga às suas prioridades Glow.","step7":"07 — EXPLORE A SUA WISHLIST","step7Text":"Guarde produtos que poderá considerar mais tarde. A Wishlist serve para explorar possibilidades com informação — não para pressionar a comprar.","cta":"CONTINUAR A MINHA JORNADA GLOW →","closing":"A sua Glow Journey começa agora. Volte quando estiver pronto e continue a partir da inteligência que já tem.","journeyId":"Glow Journey ID:","note":"UMA NOTA DO GLOW AI™","noteText":"Os seus resultados Glow baseiam-se na análise visual da imagem enviada e destinam-se a orientação pessoal sobre bem-estar e aparência."};
EMAIL_COPY.de.onboarding={"subject":"Ihr Glow Plan ist bereit – das sind die nächsten Schritte. ✨","preheader":"Sie haben die Insights. Jetzt setzen wir sie in die Praxis um.","title":"Ihr Glow Plan ist bereit. Jetzt setzen wir ihn um.","hi":"Hallo,","intro":"Ihr Personal Glow Plan ist Ihr Ausgangspunkt – nicht das Ziel. Um den größten Nutzen aus GLOW AI zu ziehen, folgen Sie einigen einfachen Schritten in Ihrer Journey.","lead":"Sie haben die Insights. Jetzt machen wir daraus konkrete Schritte.","step1":"01 — LESEN SIE IHREN PERSONAL GLOW REPORT","step1Text":"Lesen Sie den Bericht vollständig. Beginnen Sie mit Ihrem Glow-Profil, Glow Archetype™ und Ihren 3 Glow-Prioritäten™, um die Geschichte hinter Ihren Ergebnissen zu verstehen.","step2":"02 — ENTDECKEN SIE GLOW INTELLIGENCE","step2Text":"Öffnen Sie Glow Intelligence und entdecken Sie die Tools, mit denen Sie auf Basis Ihres persönlichen Glow-Profils fundiertere Entscheidungen treffen können.","step3":"03 — PRÜFEN SIE IHR GLOW-PROFIL","step3Text":"Sehen Sie sich Ihre sechs Glow-Dimensionen, Ihren Archetype und die Prioritäten an, die Ihre personalisierte Journey bestimmen.","step4":"04 — ERSTELLEN SIE IHR DIGITALES REGAL","step4Text":"Fügen Sie die Pflege-, Beauty- und persönlichen Pflegeprodukte hinzu, die Sie bereits besitzen. Kaufen Sie noch nichts – zeigen Sie GLOW AI, was bereits in Ihrem Regal steht.","step5":"05 — PRÜFEN SIE DIE INTELLIGENZ IHRES REGALS","step5Text":"Sehen Sie, was Ihre vorhandenen Produkte für Ihre Glow-Prioritäten bedeuten, wo sie passen und wo Lücken bestehen können.","step6":"06 — VERSTEHEN SIE IHRE ROUTINE","step6Text":"Prüfen Sie Ihre personalisierte Routine und verstehen Sie, was Sie wann verwenden und wie jeder Schritt mit Ihren Glow-Prioritäten verbunden ist.","step7":"07 — ENTDECKEN SIE IHRE WISHLIST","step7Text":"Speichern Sie Produkte, die Sie später in Betracht ziehen könnten. Ihre Wishlist dient informierten Möglichkeiten – nicht dem Kaufdruck.","cta":"MEINE GLOW JOURNEY FORTSETZEN →","closing":"Ihre Glow Journey beginnt jetzt. Kommen Sie zurück, wann immer Sie bereit sind, und bauen Sie auf den Insights auf, die Sie bereits haben.","journeyId":"Glow Journey ID:","note":"EINE NOTIZ VON GLOW AI™","noteText":"Ihre Glow-Ergebnisse basieren auf der visuellen Analyse Ihres eingereichten Bildes und dienen der persönlichen Orientierung zu Wellness und Erscheinungsbild."};
EMAIL_COPY.it.onboarding={"subject":"Il tuo Glow Plan è pronto — ecco cosa fare ora. ✨","preheader":"Hai gli insight. Ora trasformiamoli in azione.","title":"Il tuo Glow Plan è pronto. Ora mettiamolo in pratica.","hi":"Ciao,","intro":"Il tuo Personal Glow Plan è il tuo punto di partenza, non il traguardo. Per ottenere il massimo da GLOW AI, segui alcuni semplici passaggi nel tuo Journey.","lead":"Hai gli insight. Ora trasformiamoli in azione.","step1":"01 — LEGGI IL TUO REPORT PERSONAL GLOW","step1Text":"Leggi il report completo. Inizia dal tuo Glow Profile, Glow Archetype™ e dalle tue 3 Glow Priorities™ per comprendere la storia dietro i risultati.","step2":"02 — ESPLORA GLOW INTELLIGENCE","step2Text":"Vai a Glow Intelligence e scopri gli strumenti che ti aiutano a prendere decisioni più informate in base al tuo profilo Glow personale.","step3":"03 — RIVEDI IL TUO PROFILO GLOW","step3Text":"Esamina le tue sei dimensioni Glow, il tuo archetype e le priorità che guidano il tuo Journey personalizzato.","step4":"04 — CREA IL TUO SCAFFALE DIGITALE","step4Text":"Aggiungi i prodotti skincare, beauty e cura personale che già possiedi. Non comprare ancora nulla: mostra a GLOW AI cosa hai già sul tuo scaffale.","step5":"05 — CONTROLLA L’INTELLIGENZA DEL TUO SCAFFALE","step5Text":"Scopri cosa significano i prodotti che possiedi per le tue priorità Glow, dove si inseriscono e dove possono esserci lacune.","step6":"06 — COMPRENDI LA TUA ROUTINE","step6Text":"Rivedi la tua routine personalizzata e comprendi cosa usare, quando usarlo e come ogni passaggio si collega alle tue priorità Glow.","step7":"07 — ESPLORA LA TUA WISHLIST","step7Text":"Salva i prodotti che potresti valutare in seguito. La Wishlist serve a esplorare possibilità informate, non a spingerti ad acquistare.","cta":"CONTINUA IL MIO GLOW JOURNEY →","closing":"Il tuo Glow Journey inizia ora. Torna quando vuoi e continua a costruire sugli insight che già possiedi.","journeyId":"Glow Journey ID:","note":"UNA NOTA DA GLOW AI™","noteText":"I tuoi risultati Glow si basano sull’analisi visiva dell’immagine inviata e sono pensati per una guida personale su benessere e aspetto."};
function localizedFooter(language){const l=String(language||"en").toLowerCase();const map={en:{product:"GLOW AI is a product of Telinno Consulting (UK) Limited.",address:"Registered Address: 27 Old Gloucester Street, London, WC1N 3AX, United Kingdom",company:"Company Number: 13324690",vat:"VAT Registration Number: 436 1060 27"},fr:{product:"GLOW AI est un produit de Telinno Consulting (UK) Limited.",address:"Adresse enregistrée : 27 Old Gloucester Street, London, WC1N 3AX, Royaume-Uni",company:"Numéro de société : 13324690",vat:"Numéro de TVA : 436 1060 27"},es:{product:"GLOW AI es un producto de Telinno Consulting (UK) Limited.",address:"Domicilio social: 27 Old Gloucester Street, London, WC1N 3AX, Reino Unido",company:"Número de empresa: 13324690",vat:"Número de IVA: 436 1060 27"},pt:{product:"GLOW AI é um produto da Telinno Consulting (UK) Limited.",address:"Morada registada: 27 Old Gloucester Street, London, WC1N 3AX, Reino Unido",company:"Número da empresa: 13324690",vat:"Número de IVA: 436 1060 27"},de:{product:"GLOW AI ist ein Produkt der Telinno Consulting (UK) Limited.",address:"Eingetragene Adresse: 27 Old Gloucester Street, London, WC1N 3AX, Vereinigtes Königreich",company:"Unternehmensnummer: 13324690",vat:"Umsatzsteuer-ID: 436 1060 27"},it:{product:"GLOW AI è un prodotto di Telinno Consulting (UK) Limited.",address:"Sede registrata: 27 Old Gloucester Street, London, WC1N 3AX, Regno Unito",company:"Numero di società: 13324690",vat:"Numero IVA: 436 1060 27"}};const x=map[l]||map.en;return{html:`<div style="margin-top:18px;padding-top:14px;border-top:1px solid #e7e0d4;font-size:10px;line-height:1.55;color:#6d675f"><b style="color:#191715">GLOW AI™ · SEE YOUR GLOW. START YOUR JOURNEY.</b><p style="margin:8px 0 0">${x.product}</p><p style="margin:6px 0 0">${x.address}<br>${x.company}<br>${x.vat}</p></div>`,text:`GLOW AI™ · SEE YOUR GLOW. START YOUR JOURNEY.\n${x.product}\n${x.address}\n${x.company}\n${x.vat}`};}
function emailCopy(language){ const l=String(language||"en").toLowerCase(); return EMAIL_COPY[EMAIL_COPY[l]?l:"en"]; }

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function trustedInlineHtml(value) {
  const s = String(value ?? "");
  // Only centrally-authored localisation markup is permitted here.
  // Supported tags: <br> and <span>, with no attributes.
  if (!/^(?:[^<]|<br\s*\/?\s*>|<span>|<\/span>)*$/i.test(s)) return esc(s);
  return s;
}

function text(value) {
  return String(value ?? "");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}

async function freshPlanPdf(journey) {
  const key = "glow-plans/" + journey.journey_id + ".pdf";

  try {
    const existing = await storage.head(key);
    if (existing?.size) {
      const url = await storage.urlPermanent(key);
      await db.query("UPDATE glow_journeys SET pdf_url = $1 WHERE journey_id = $2", [url, journey.journey_id]);
      return url;
    }
  } catch (_) {
    // Generate the PDF below when the existing object is unavailable.
  }

  const htmlUrl = BASE_URL + "/api/report-html?journey_id=" + encodeURIComponent(journey.journey_id);
  const pdf = await browser.pdf(htmlUrl);
  await storage.put(key, pdf, "application/pdf");
  const url = await storage.urlPermanent(key);
  await db.query("UPDATE glow_journeys SET pdf_url = $1 WHERE journey_id = $2", [url, journey.journey_id]);
  return url;
}

async function getJourney(journeyId) {
  const q = await db.query("SELECT * FROM glow_journeys WHERE journey_id = $1 LIMIT 1", [journeyId]);
  return q.rows[0] || null;
}

async function getOrCreateDelivery(journeyId, deliveryType) {
  const existing = await db.query(
    "SELECT * FROM glow_delivery_events WHERE journey_id = $1 AND delivery_type = $2 LIMIT 1",
    [journeyId, deliveryType]
  );
  if (existing.rows[0]) return existing.rows[0];

  const inserted = await db.query(
    "INSERT INTO glow_delivery_events (journey_id,delivery_type,status) VALUES ($1,$2,'QUEUED') ON CONFLICT (journey_id,delivery_type) DO NOTHING RETURNING *",
    [journeyId, deliveryType]
  );
  if (inserted.rows[0]) return inserted.rows[0];

  const retry = await db.query(
    "SELECT * FROM glow_delivery_events WHERE journey_id = $1 AND delivery_type = $2 LIMIT 1",
    [journeyId, deliveryType]
  );
  return retry.rows[0] || null;
}

export async function enqueueCustomerEmail(journeyId, deliveryType, deliveryContext = {}) {
  const journey = await getJourney(journeyId);
  if (!journey) throw new Error("Glow Journey not found");

  if (deliveryType === "EMAIL_PDF" && journey.email_sent_at) {
    return { queued: false, sent: true, reason: "ALREADY_SENT" };
  }
  if (deliveryType === "EMAIL_PAID_ONBOARDING" && journey.payment_status !== "paid") {
    return { queued: false, sent: false, reason: "NOT_PAID" };
  }
  if (deliveryType === "EMAIL_JOURNEY_LINK" && journey.day30_completed) {
    return { queued: false, sent: false, reason: "DAY30_COMPLETED" };
  }
  if (deliveryType === "EMAIL_24H_REMINDER" && (journey.payment_status === "paid" || journey.day30_completed)) {
    return { queued: false, sent: false, reason: journey.payment_status === "paid" ? "ALREADY_PAID" : "DAY30_COMPLETED" };
  }
  if (deliveryType === "EMAIL_72H_REMINDER" && (journey.payment_status === "paid" || journey.day30_completed)) {
    return { queued: false, sent: false, reason: journey.payment_status === "paid" ? "ALREADY_PAID" : "DAY30_COMPLETED" };
  }
  if (!journey.email) {
    return { queued: false, sent: false, reason: "NO_EMAIL" };
  }

  const event = await getOrCreateDelivery(journey.id, deliveryType);
  if (!event) throw new Error("Could not create email delivery record");

  if (deliveryType === "EMAIL_FREE_SNAPSHOT" && deliveryContext && Object.keys(deliveryContext).length) {
    await db.query("UPDATE glow_delivery_events SET delivery_context=$1 WHERE id=$2", [JSON.stringify(deliveryContext), event.id]);
  }

  if (event.status === "SENT") return { queued: false, sent: true, reason: "ALREADY_SENT" };
  if (event.status === "SENDING") return { queued: false, sent: false, reason: "IN_PROGRESS" };

  await db.query(
    "UPDATE glow_delivery_events SET status='QUEUED', failure_reason=NULL WHERE id=$1 AND status IN ('FAILED','QUEUED')",
    [event.id]
  );
  return { queued: true, sent: false, deliveryId: event.id };
}

async function claimDelivery(deliveryId) {
  const q = await db.query(
    "UPDATE glow_delivery_events SET status='SENDING', queued_at=now(), failure_reason=NULL WHERE id=$1 AND status IN ('QUEUED','FAILED') RETURNING *",
    [deliveryId]
  );
  return q.rows[0] || null;
}

async function markSent(deliveryId, providerReference) {
  await db.query(
    "UPDATE glow_delivery_events SET status='SENT', provider_reference=$1, failure_reason=NULL, sent_at=now() WHERE id=$2",
    [providerReference || null, deliveryId]
  );
  await db.query(
    "UPDATE glow_journeys SET email_sent_at=COALESCE(email_sent_at,now()) WHERE id=(SELECT journey_id FROM glow_delivery_events WHERE id=$1) AND payment_status='paid' AND email_sent_at IS NULL",
    [deliveryId]
  );
}

async function markFailed(deliveryId, reason) {
  await db.query(
    "UPDATE glow_delivery_events SET status='FAILED', failure_reason=$1 WHERE id=$2",
    [text(reason).slice(0, 2000), deliveryId]
  );
}

async function sendPlanEmail(journey, deliveryId) {
  const pdfUrl = await freshPlanPdf(journey);
  const c=content(journey.language||"en"); const medical=c.report.notMedical; const e=emailCopy(journey.language).plan;
  const subject=e.subject; const preheader=e.preheader;
  const html = `<div style="margin:0;padding:0;background:#f6f3ed;font-family:Inter,Arial,sans-serif;color:#191715;line-height:1.65">
  <div style="max-width:620px;margin:0 auto;background:#fffdf9">
    <div style="padding:26px 30px;border-bottom:1px solid #e7e0d4;letter-spacing:.14em;font-size:11px;font-weight:600">GLOW AI™</div>
    <div style="padding:12px 30px 0;text-align:center;color:#8d7547;font-size:11px;letter-spacing:.18em;font-weight:600">${esc(e.eyebrow)}</div>
    <div style="padding:34px 30px 30px;text-align:center;background:#fbf8f1">
      <div style="display:none;font-size:1px;color:#f6f3ed;max-height:0;overflow:hidden">${esc(preheader)}</div>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:34px;line-height:1.1;font-weight:500">${esc(e.title)}</h1>
    </div>
    <div style="padding:34px 30px">
      <p style="margin:0 0 22px;font-size:15px">${esc(e.hi)}</p>
      <p style="margin:0 0 30px;font-size:15px">${esc(e.intro)}</p>
      <div style="border-top:1px solid #e7e0d4;border-bottom:1px solid #e7e0d4;padding:26px 0 8px">
        <div style="font-size:11px;letter-spacing:.16em;font-weight:600;color:#8d7547;margin-bottom:10px">${esc(e.eyebrow)}</div>
        <p style="margin:0 0 24px;font-family:Georgia,serif;font-size:24px">${esc(e.body)}</p>
        <div style="margin-bottom:18px"><b>${esc(e.story)}</b><br><span style="font-size:14px;color:#6d675f">${esc(e.storyText)}</span></div>
        <div style="margin-bottom:18px"><b>${esc(e.priorities)}</b><br><span style="font-size:14px;color:#6d675f">${esc(e.prioritiesText)}</span></div>
        <div style="margin-bottom:18px"><b>${esc(e.archetype)}</b><br><span style="font-size:14px;color:#6d675f">${esc(e.archetypeText)}</span></div>
        <div style="margin-bottom:18px"><b>${esc(e.ritual)}</b><br><span style="font-size:14px;color:#6d675f">${esc(e.ritualText)}</span></div>
      </div>
      <div style="text-align:center;padding:30px 0 8px">
        <div style="font-size:11px;letter-spacing:.16em;font-weight:600;color:#8d7547;margin-bottom:10px">${esc(e.ready)}</div>
        <a href="${esc(pdfUrl)}" style="display:block;width:100%;box-sizing:border-box;padding:14px 16px;background:#191715;color:#fff;text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:.03em;text-align:center">${esc(e.cta)}</a>
      </div>
      <p style="font-size:12px;color:#6d675f;text-align:center;margin:10px 0 12px">${esc(e.secure)}</p>
      <p style="font-size:12px;color:#6d675f;text-align:center"><b style="color:#191715">${esc(e.journeyId)}</b> ${esc(journey.journey_id)}</p>
      <p style="font-size:12px;color:#6d675f;text-align:center;margin-bottom:30px">${esc(e.keep)}</p>
      <div style="border-top:1px solid #e7e0d4;padding-top:26px">
        <div style="font-size:11px;letter-spacing:.16em;font-weight:600;color:#8d7547;margin-bottom:10px">${esc(e.continues)}</div>
        <h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:23px;font-weight:500">${esc(e.continueText)}</h2>
      </div>
      <div style="margin-top:30px;padding-top:20px;border-top:1px solid #e7e0d4;font-size:11px;color:#6d675f">
        <p>${esc(medical)}</p>
        ${localizedFooter(journey.language).html}
      </div>
    </div>
  </div></div>`;
  const plain = `${e.subject}\n\n${preheader}\n\n${e.title}\n\n${e.hi}\n\n${e.intro}\n\n${e.eyebrow}\n${e.body}\n\n${e.story}\n${e.storyText}\n\n${e.priorities}\n${e.prioritiesText}\n\n${e.archetype}\n${e.archetypeText}\n\n${e.ritual}\n${e.ritualText}\n\n${e.ready}\n${e.cta} ${pdfUrl}\n\n${e.secure}\n${e.journeyId} ${journey.journey_id}\n${e.keep}\n\n${e.continues}\n${e.continueText}\n\n${medical}\n\n${localizedFooter(journey.language).text}`;
  const result = await email.send({ from: "GLOW AI <hello@glow-ai.co>", replyTo: "hello@glow-ai.co", to: journey.email, subject, html, text: plain });
  if (result?.success === false) throw new Error("Email provider did not accept the message");
  await markSent(deliveryId, result?.message_id || result?.ses_message_id || null);
  return { sent: true, deliveryId };
}

async function sendOnboardingEmail(journey, deliveryId) {
  const c=content(journey.language||"en"); const e=emailCopy(journey.language).onboarding || EMAIL_COPY.en.onboarding;
  const rawToken=randomToken(); const tokenHash=await sha256(rawToken);
  await db.query("INSERT INTO glow_access_tokens (journey_id,token_hash,token_type,expires_at) VALUES ($1,$2,'PAID_CONTINUITY',now()+interval '30 days')",[journey.id,tokenHash]);
  const carriedReferral=String(journey.rewardful_referral||"").trim();
  const continuityUrl=BASE_URL+"/continue?t="+encodeURIComponent(rawToken)+(carriedReferral?"&referral="+encodeURIComponent(carriedReferral):"");
  const steps=[
    [e.step1,e.step1Text],[e.step2,e.step2Text],[e.step3,e.step3Text],
    [e.step4,e.step4Text],[e.step5,e.step5Text],[e.step6,e.step6Text],[e.step7,e.step7Text]
  ];
  const stepHtml=steps.map(([title,body])=>`<div style="padding:18px 0;border-bottom:1px solid #e7e0d4"><div style="font-size:11px;letter-spacing:.08em;font-weight:700;color:#8d7547;margin-bottom:7px">${esc(title)}</div><div style="font-size:14px;color:#5f5a53">${esc(body)}</div></div>`).join("");
  const html=`<div style="margin:0;padding:0;background:#f6f3ed;font-family:Inter,Arial,sans-serif;color:#191715;line-height:1.65"><div style="max-width:620px;margin:0 auto;background:#fffdf9">
    <div style="padding:26px 30px;border-bottom:1px solid #e7e0d4;letter-spacing:.14em;font-size:11px;font-weight:600">GLOW AI™</div>
    <div style="padding:12px 30px 0;text-align:center;color:#8d7547;font-size:11px;letter-spacing:.18em;font-weight:600">${esc(({en:"YOUR GLOW JOURNEY",fr:"VOTRE PARCOURS GLOW",es:"TU RECORRIDO GLOW",pt:"A SUA JORNADA GLOW",de:"IHRE GLOW JOURNEY",it:"IL TUO PERCORSO GLOW"}[journey.language||"en"]||"YOUR GLOW JOURNEY"))}</div>
    <div style="padding:34px 30px 30px;text-align:center;background:#fbf8f1"><div style="display:none;font-size:1px;color:#f6f3ed;max-height:0;overflow:hidden">${esc(e.preheader)}</div><h1 style="margin:0;font-family:Georgia,serif;font-size:34px;line-height:1.1;font-weight:500">${esc(e.title)}</h1></div>
    <div style="padding:34px 30px">
      <p style="margin:0 0 22px;font-size:15px">${esc(e.hi)}</p>
      <p style="margin:0 0 22px;font-size:15px">${esc(e.intro)}</p>
      <div style="padding:24px;background:#f7f2e8;margin-bottom:26px"><div style="font-family:Georgia,serif;font-size:22px;margin-bottom:8px">${esc(e.lead)}</div><div style="font-size:13px;color:#6d675f">${esc(e.closing)}</div></div>
      <div>${stepHtml}</div>
      <div style="text-align:center;padding:32px 0 12px"><a href="${esc(continuityUrl)}" style="display:block;width:100%;box-sizing:border-box;padding:15px 16px;background:#191715;color:#fff;text-decoration:none;border-radius:999px;font-size:13px;font-weight:700;letter-spacing:.04em;text-align:center">${esc(e.cta)}</a></div>
      <p style="font-size:12px;color:#6d675f;text-align:center;margin:8px 0 24px">${esc(e.journeyId)} ${esc(journey.journey_id)}</p>
      <div style="margin-top:18px;padding-top:20px;border-top:1px solid #e7e0d4;font-size:11px;color:#6d675f"><b style="color:#191715">${esc(e.note)}</b><p>${esc(e.noteText)}</p><p>${esc(c.report.notMedical)}</p>${localizedFooter(journey.language).html}</div>
    </div>
  </div></div>`;
  const plain=[e.title,e.preheader,e.hi,e.intro,e.lead,e.closing,...steps.flat(),e.cta+" "+continuityUrl,e.journeyId+" "+journey.journey_id,c.report.notMedical,localizedFooter(journey.language).text].join("\n\n");
  const result=await email.send({from:"GLOW AI <hello@glow-ai.co>",replyTo:"hello@glow-ai.co",to:journey.email,subject:e.subject,html,text:plain});
  if(result?.success===false) throw new Error("Email provider did not accept the message");
  await markSent(deliveryId,result?.message_id||result?.ses_message_id||null);
  return {sent:true,deliveryId};
}

async function sendFreeSnapshotEmail(journey, delivery) {
  const context = delivery.delivery_context || {};
  const c=content(journey.language||"en");const e=c.email;const medical=c.report.notMedical;
  const pdfUrl = text(context.pdf_url);
  const continuityUrl = text(context.continuity_url);
  if (!pdfUrl || !continuityUrl) throw new Error("Free snapshot delivery context is incomplete");

  const subject = e.freeSubject;
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#191715;line-height:1.6">
    <div style="padding:28px;border-bottom:1px solid #e7e0d4;letter-spacing:.14em;font-size:11px;font-weight:600">GLOW AI™</div><div style="padding:42px 28px 30px;text-align:center;background:#fbf8f1"><div style="font-size:11px;letter-spacing:.18em;font-weight:600;color:#8d7547;margin-bottom:18px">SEE YOUR GLOW. START YOUR JOURNEY.</div><h1 style="margin:0;font-family:Georgia,serif;font-size:34px;line-height:1.1;font-weight:500">${esc(e.freeTitle)}</h1></div><div style="padding:34px 28px">
    <p style="margin:0 0 24px;font-size:15px">${esc(e.freeBody)}</p><p style="margin:0 0 30px;font-family:Georgia,serif;font-size:20px">${trustedInlineHtml(c.report.nextTitle)}</p><div style="border-top:1px solid #e7e0d4;border-bottom:1px solid #e7e0d4;padding:24px 0 10px"><div style="font-size:11px;letter-spacing:.16em;font-weight:600;color:#8d7547;margin-bottom:10px">${esc(e.freeTitle)}</div><h2 style="margin:0 0 22px;font-family:Georgia,serif;font-size:25px;font-weight:500">${esc(c.report.profile)}</h2><div style="margin-bottom:18px"><b>${esc(c.report.score)}</b><br><span style="font-size:14px;color:#6d675f">${esc(c.report.sixSub)}</span></div><div style="margin-bottom:18px"><b>${esc(c.report.archetype)}</b><br><span style="font-size:14px;color:#6d675f">${esc(c.report.sixSub)}</span></div><div style="margin-bottom:24px"><b>${esc(c.report.top3)}</b><br><span style="font-size:14px;color:#6d675f">${esc(c.report.prioritySub)}</span></div></div>
    <p><b>${esc(e.journeyId)}</b> ${esc(journey.journey_id)}</p>
    <p style="text-align:center;padding:28px 0 8px"><a href="${esc(pdfUrl)}" style="display:block;width:100%;box-sizing:border-box;padding:14px 16px;background:#191715;color:#fff;text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:.03em;text-align:center">${esc(e.view)} →</a><br><span style="font-size:12px;color:#7a746c">${esc(e.view)}</span></p>
    <div style="margin-top:28px;padding:28px;background:#f7f2e8;text-align:center"><div style="font-size:11px;letter-spacing:.16em;font-weight:600;color:#8d7547;margin-bottom:10px">${esc(c.email.planTitle)}</div><h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:23px;font-weight:500">${trustedInlineHtml(c.report.nextTitle)}</h2><p style="margin:0 auto 20px;max-width:460px;font-size:14px;color:#5f5a53">${esc(e.freeUpsell)}</p><a href="${esc(continuityUrl)}" style="display:block;width:100%;box-sizing:border-box;padding:14px 16px;background:#C4A66A;color:#191715;text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:.03em;text-align:center">${esc(e.continue)} →</a></div>
    <p style="font-size:12px;color:#6d675f;margin:18px 0">${esc(e.journeyKeep)}</p>
    <p style="font-size:12px;color:#6d675f">${esc(c.report.private)} ${esc(medical)}</p>
    ${localizedFooter(journey.language).html}
    </div></div></div>
  </div>`;
  const plain = `${e.freeTitle}\n\n${e.journeyId} ${journey.journey_id}\n\n${e.view}: ${pdfUrl}\n\n${e.continue}: ${continuityUrl}\n\n${e.freeUpsell}\n\n${c.report.private} ${medical}\n\n${localizedFooter(journey.language).text}\n`;
  const result = await email.send({ from: "GLOW AI <hello@glow-ai.co>", replyTo: "hello@glow-ai.co", to: journey.email, subject, html, text: plain });
  if (result?.success === false) throw new Error("Email provider did not accept the message");
  await markSent(delivery.id, result?.message_id || result?.ses_message_id || null);
  return { sent: true, deliveryId: delivery.id };
}

async function send24HourReminderEmail(journey, deliveryId) {
  const c = content(journey.language||"en"); const e=emailCopy(journey.language).r24;
  const rawToken = randomToken(); const tokenHash = await sha256(rawToken);
  await db.query("INSERT INTO glow_access_tokens (journey_id,token_hash,token_type,expires_at) VALUES ($1,$2,'FREE_CONTINUITY',now()+interval '30 days')", [journey.id, tokenHash]);
  const carriedReferral = String(journey.rewardful_referral||"").trim();
  const continuityUrl = BASE_URL + "/continue?t=" + encodeURIComponent(rawToken) + (carriedReferral ? "&referral=" + encodeURIComponent(carriedReferral) : "");
  const subject=e.subject;
  const html = `<div style="margin:0;padding:0;background:#f6f3ed;font-family:Inter,Arial,sans-serif;color:#191715;line-height:1.65"><div style="max-width:620px;margin:0 auto;background:#fffdf9">
    <div style="padding:28px;border-bottom:1px solid #e7e0d4;letter-spacing:.14em;font-size:11px;font-weight:600">GLOW AI™</div>
    <div style="padding:18px 28px 10px;text-align:center"><div style="font-size:11px;letter-spacing:.18em;font-weight:600;color:#8d7547">${esc(({en:"YOUR GLOW JOURNEY",fr:"VOTRE PARCOURS GLOW",es:"TU RECORRIDO GLOW",pt:"A SUA JORNADA GLOW",de:"IHRE GLOW JOURNEY",it:"IL TUO PERCORSO GLOW"}[journey.language||"en"]||"YOUR GLOW JOURNEY"))}</div></div>
    <div style="padding:28px 28px 18px;text-align:center;background:#fbf8f1"><h1 style="margin:0;font-family:Georgia,serif;font-size:34px;line-height:1.12;font-weight:500">${esc(e.title)}</h1><p style="margin:16px 0 0;font-size:12px;letter-spacing:.05em;color:#6d675f">${esc(e.preheader)}</p></div>
    <div style="padding:34px 28px">
      <p style="margin:0 0 22px;font-size:15px">${esc(e.hi)}</p>
      <p style="margin:0 0 24px;font-size:15px">${esc(e.intro)}</p>
      <p style="margin:0 0 28px;font-size:15px">${esc(e.known)}</p>
      <div style="border-top:1px solid #e7e0d4;padding:28px 0"><h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:25px;font-weight:500">${esc(e.heading)}</h2><p style="margin:0;font-size:15px;color:#5f5a53">${esc(e.pattern)}</p></div>
      <div style="padding:28px;background:#f7f2e8"><div style="font-size:11px;letter-spacing:.16em;font-weight:600;color:#8d7547;margin-bottom:10px">${esc(e.eyebrow)}</div><h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:24px;font-weight:500">${esc(e.subheading)}</h2><p style="margin:0 0 20px;font-size:14px;color:#5f5a53">${esc(e.body)}</p><p style="margin:0 0 10px;font-size:13px"><b>${esc(e.story)}</b><br><span style="color:#6d675f">${esc(e.storyText)}</span></p><p style="margin:0 0 10px;font-size:13px"><b>${esc(e.why)}</b><br><span style="color:#6d675f">${esc(e.whyText)}</span></p><p style="margin:0;font-size:13px"><b>${esc(e.ritual)}</b><br><span style="color:#6d675f">${esc(e.ritualText)}</span></p></div>
      <p style="text-align:center;padding:28px 0 8px"><a href="${esc(continuityUrl)}" style="display:block;width:100%;box-sizing:border-box;padding:14px 16px;background:#191715;color:#fff;text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:.03em;text-align:center">${esc(e.cta)}</a></p>
      <p style="text-align:center;font-size:12px;color:#7a746c;margin:0 0 28px">${esc(e.saved)}</p>
      <div style="border-top:1px solid #e7e0d4;padding-top:26px"><div style="font-size:11px;letter-spacing:.16em;font-weight:600;color:#8d7547;margin-bottom:10px">${esc(e.journeyEyebrow)}</div><p style="margin:0 0 12px;font-family:Georgia,serif;font-size:21px">${esc(e.journeyTitle)}</p><p style="margin:0;font-size:14px;color:#5f5a53">${esc(e.journeyText)}</p><p style="font-size:12px;color:#6d675f;margin:18px 0 0"><b style="color:#191715">${esc(e.journeyId)}</b> ${esc(journey.journey_id)}</p></div>
      <div style="margin-top:30px;padding-top:20px;border-top:1px solid #e7e0d4;font-size:11px;color:#6d675f"><b style="color:#191715">${esc(e.note)}</b><p>${esc(e.noteText)}</p><p>${esc(c.report.notMedical)}</p>${localizedFooter(journey.language).html}</div>
    </div>
  </div></div>`;
  const plain=`${e.title}\n\n${e.preheader}\n\n${e.intro}\n\n${e.known}\n\n${e.heading}\n${e.pattern}\n\n${e.eyebrow}\n${e.subheading}\n${e.body}\n\n${e.story} — ${e.storyText}\n${e.why} — ${e.whyText}\n${e.ritual} — ${e.ritualText}\n\n${e.cta} ${continuityUrl}\n\n${e.saved}\n\n${e.journeyId} ${journey.journey_id}\n\n${c.report.private} ${c.report.notMedical}\n\n${localizedFooter(journey.language).text}`;
  const result=await email.send({from:"GLOW AI <hello@glow-ai.co>",replyTo:"hello@glow-ai.co",to:journey.email,subject,html,text:plain});
  if(result?.success===false) throw new Error("Email provider did not accept the message");
  await markSent(deliveryId,result?.message_id||result?.ses_message_id||null);
  return {sent:true,deliveryId};
}

async function send72HourReminderEmail(journey, deliveryId) {
  const c = content(journey.language||"en"); const e=emailCopy(journey.language).r72;
  const rawToken=randomToken(); const tokenHash=await sha256(rawToken);
  await db.query("INSERT INTO glow_access_tokens (journey_id,token_hash,token_type,expires_at) VALUES ($1,$2,'FREE_CONTINUITY',now()+interval '30 days')",[journey.id,tokenHash]);
  const carriedReferral=String(journey.rewardful_referral||"").trim();
  const continuityUrl=BASE_URL+"/continue?t="+encodeURIComponent(rawToken)+(carriedReferral?"&referral="+encodeURIComponent(carriedReferral):"");
  const subject=e.subject;
  const html=`<div style="margin:0;padding:0;background:#f6f3ed;font-family:Inter,Arial,sans-serif;color:#191715;line-height:1.65"><div style="max-width:620px;margin:0 auto;background:#fffdf9">
    <div style="padding:28px;border-bottom:1px solid #e7e0d4;letter-spacing:.14em;font-size:11px;font-weight:600">GLOW AI™</div>
    <div style="padding:18px 28px 10px;text-align:center"><div style="font-size:11px;letter-spacing:.18em;font-weight:600;color:#8d7547">${esc(({en:"YOUR GLOW JOURNEY",fr:"VOTRE PARCOURS GLOW",es:"TU RECORRIDO GLOW",pt:"A SUA JORNADA GLOW",de:"IHRE GLOW JOURNEY",it:"IL TUO PERCORSO GLOW"}[journey.language||"en"]||"YOUR GLOW JOURNEY"))}</div></div>
    <div style="padding:28px;text-align:center;background:#fbf8f1"><h1 style="margin:0;font-family:Georgia,serif;font-size:34px;line-height:1.12;font-weight:500">${esc(e.title)}</h1><p style="margin:16px 0 0;font-size:12px;letter-spacing:.05em;color:#6d675f">${esc(e.preheader)}</p></div>
    <div style="padding:34px 28px">
      <p style="margin:0 0 22px;font-size:15px">${esc(e.hi)}</p><p style="margin:0 0 24px;font-size:15px">${esc(e.intro)}</p><p style="margin:0 0 26px;font-size:15px">${esc(e.known)}</p>
      <div style="padding:26px;background:#f7f2e8"><div style="font-size:11px;letter-spacing:.16em;font-weight:600;color:#8d7547;margin-bottom:10px">${esc(e.eyebrow)}</div><p style="margin:0;font-family:Georgia,serif;font-size:22px">${esc(e.body)}</p></div>
      <p style="text-align:center;padding:28px 0 8px"><a href="${esc(continuityUrl)}" style="display:block;width:100%;box-sizing:border-box;padding:14px 16px;background:#191715;color:#fff;text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:.03em;text-align:center">${esc(e.cta)}</a></p>
      <p style="text-align:center;font-size:12px;color:#7a746c;margin:0 0 26px">${esc(e.saved)}<br>${esc(e.noNew)}</p>
      <div style="border-top:1px solid #e7e0d4;padding-top:22px;font-size:12px;color:#6d675f"><b style="color:#191715">${esc(e.journeyId)}</b> ${esc(journey.journey_id)}</div>
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e7e0d4;font-size:11px;color:#6d675f"><p>${esc(c.report.notMedical)}</p>${localizedFooter(journey.language).html}</div>
    </div>
  </div></div>`;
  const plain=`${e.title}\n\n${e.preheader}\n\n${e.intro}\n\n${e.known}\n\n${e.eyebrow}\n${e.body}\n\n${e.cta} ${continuityUrl}\n\n${e.saved}\n${e.noNew}\n\n${e.journeyId} ${journey.journey_id}\n\n${c.report.notMedical}\n\n${localizedFooter(journey.language).text}`;
  const result=await email.send({from:"GLOW AI <hello@glow-ai.co>",replyTo:"hello@glow-ai.co",to:journey.email,subject,html,text:plain});
  if(result?.success===false) throw new Error("Email provider did not accept the message");
  await markSent(deliveryId,result?.message_id||result?.ses_message_id||null);
  return {sent:true,deliveryId};
}

async function sendDay29Email(journey, deliveryId) {
  const c=content(journey.language||"en"); const e=emailCopy(journey.language).day29; const medical=c.report.notMedical;
  if(journey.day30_completed){await markSent(deliveryId,"SKIPPED_DAY30_COMPLETED");return {sent:false,skipped:true};}
  await db.query("UPDATE glow_access_tokens SET revoked_at=now() WHERE journey_id=$1 AND token_type='DAY30_REMINDER' AND revoked_at IS NULL",[journey.id]);
  const rawToken=randomToken(); const tokenHash=await sha256(rawToken);
  await db.query("INSERT INTO glow_access_tokens (journey_id,token_hash,token_type,expires_at) VALUES ($1,$2,'DAY30_REMINDER',now()+interval '7 days')",[journey.id,tokenHash]);
  const magicUrl=BASE_URL+"/?day30=1&t="+encodeURIComponent(rawToken);
  const subject=e.subject; const preheader=e.preheader;
  const html=`<div style="margin:0;padding:0;background:#f6f3ed;font-family:Inter,Arial,sans-serif;color:#191715;line-height:1.65"><div style="max-width:620px;margin:0 auto;background:#fffdf9">
    <div style="padding:26px 30px;border-bottom:1px solid #e7e0d4;letter-spacing:.14em;font-size:11px;font-weight:600">GLOW AI™</div>
    <div style="padding:12px 30px 0;text-align:center;color:#8d7547;font-size:11px;letter-spacing:.18em;font-weight:600">YOUR GLOW JOURNEY</div>
    <div style="padding:34px 30px 30px;text-align:center;background:#fbf8f1"><div style="display:none;font-size:1px;color:#f6f3ed;max-height:0;overflow:hidden">${esc(preheader)}</div><h1 style="margin:0;font-family:Georgia,serif;font-size:34px;line-height:1.08;font-weight:500">${esc(e.title)}</h1><p style="margin:16px 0 0;font-size:12px;color:#6d675f;letter-spacing:.04em">${esc(e.day30)}</p></div>
    <div style="padding:34px 30px">
      <p style="margin:0 0 22px;font-size:15px">${esc(e.hi)}</p><p style="margin:0 0 22px;font-size:15px">${esc(e.intro)}</p><p style="margin:0 0 28px;font-size:15px"><b>${esc(e.tomorrow)}</b></p><p style="margin:0 0 30px;font-size:15px">${esc(e.start)}</p>
      <div style="border-top:1px solid #e7e0d4;border-bottom:1px solid #e7e0d4;padding:26px 0 8px"><div style="font-size:11px;letter-spacing:.16em;font-weight:600;color:#8d7547;margin-bottom:10px">${esc(e.eyebrow)}</div><p style="margin:0 0 24px;font-family:Georgia,serif;font-size:24px">${esc(e.heading)}</p>
        <div style="margin-bottom:18px"><b>${esc(e.score)}</b><br><span style="font-size:14px;color:#6d675f">${esc(e.scoreText)}</span></div>
        <div style="margin-bottom:18px"><b>${esc(e.six)}</b><br><span style="font-size:14px;color:#6d675f">${esc(e.sixText)}</span></div>
        <div style="margin-bottom:18px"><b>${esc(e.priorities)}</b><br><span style="font-size:14px;color:#6d675f">${esc(e.prioritiesText)}</span></div>
        <div style="margin-bottom:18px"><b>${esc(e.journey)}</b><br><span style="font-size:14px;color:#6d675f">${esc(e.journeyText)}</span></div>
      </div>
      <div style="text-align:center;padding:30px 0 8px"><div style="font-size:11px;letter-spacing:.16em;font-weight:600;color:#8d7547;margin-bottom:10px">${esc(e.comeback)}</div><p style="font-size:12px;color:#6d675f;margin:0 0 16px"><b style="color:#191715">${esc(e.journeyId)}</b> ${esc(journey.journey_id)}</p><a href="${esc(magicUrl)}" style="display:block;width:100%;box-sizing:border-box;padding:14px 16px;background:#191715;color:#fff;text-decoration:none;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:.03em;text-align:center">${esc(e.cta)}</a><p style="font-size:12px;color:#6d675f;margin:14px 0 0">${esc(e.secure)}</p></div>
      <p style="font-size:13px;color:#5f5a53;margin:22px 0 28px">${esc(e.tip)}</p>
      <div style="border-top:1px solid #e7e0d4;padding-top:26px"><div style="font-size:11px;letter-spacing:.16em;font-weight:600;color:#8d7547;margin-bottom:10px">${esc(e.lastEyebrow)}</div><h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:23px;font-weight:500">${esc(e.lastTitle)}</h2><p style="margin:0;font-size:14px;color:#5f5a53">${esc(e.lastText)}</p></div>
      <div style="margin-top:30px;padding-top:20px;border-top:1px solid #e7e0d4;font-size:11px;color:#6d675f"><p>${esc(medical)}</p>${LEGAL_FOOTER_HTML}</div>
    </div></div></div>`;
  const plain=`${e.subject}\n\n${preheader}\n\n${e.title}\n\n${e.hi}\n\n${e.intro}\n${e.tomorrow}\n\n${e.start}\n\n${e.eyebrow}\n${e.heading}\n\n${e.score}\n${e.scoreText}\n\n${e.six}\n${e.sixText}\n\n${e.priorities}\n${e.prioritiesText}\n\n${e.journey}\n${e.journeyText}\n\n${e.comeback}\n${e.journeyId} ${journey.journey_id}\n${e.cta} ${magicUrl}\n\n${e.tip}\n\n${e.lastEyebrow}\n${e.lastTitle}\n${e.lastText}\n\n${medical}\n\n${LEGAL_FOOTER_TEXT}`;
  const result=await email.send({from:"GLOW AI <hello@glow-ai.co>",replyTo:"hello@glow-ai.co",to:journey.email,subject,html,text:plain});
  if(result?.success===false) throw new Error("Email provider did not accept the message");
  await markSent(deliveryId,result?.message_id||result?.ses_message_id||null);
  return {sent:true,deliveryId};
}

export async function processCustomerEmail(deliveryId) {
  const delivery = await claimDelivery(deliveryId);
  if (!delivery) return { sent: false, skipped: true, reason: "NOT_CLAIMED" };

  try {
    const journey = await getJourneyByInternalId(delivery.journey_id);
    if (!journey) throw new Error("Glow Journey not found");

    if (delivery.delivery_type === "EMAIL_PDF") {
      return await sendPlanEmail(journey, delivery.id);
    }
    if (delivery.delivery_type === "EMAIL_PAID_ONBOARDING") {
      return await sendOnboardingEmail(journey, delivery.id);
    }
    if (delivery.delivery_type === "EMAIL_FREE_SNAPSHOT") {
      return await sendFreeSnapshotEmail(journey, delivery);
    }
    if (delivery.delivery_type === "EMAIL_24H_REMINDER") {
      return await send24HourReminderEmail(journey, delivery.id);
    }
    if (delivery.delivery_type === "EMAIL_72H_REMINDER") {
      return await send72HourReminderEmail(journey, delivery.id);
    }
    if (delivery.delivery_type === "EMAIL_JOURNEY_LINK") {
      return await sendDay29Email(journey, delivery.id);
    }

    throw new Error("Unsupported customer email type: " + delivery.delivery_type);
  } catch (error) {
    await markFailed(delivery.id, error?.message || String(error));
    console.error("Customer email delivery failed", delivery.delivery_type, delivery.journey_id, error);
    return { sent: false, failed: true, deliveryId: delivery.id, error: error?.message || String(error) };
  }
}

async function getJourneyByInternalId(id) {
  const q = await db.query("SELECT * FROM glow_journeys WHERE id=$1 LIMIT 1", [id]);
  return q.rows[0] || null;
}