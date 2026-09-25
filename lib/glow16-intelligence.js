import { db } from "hatchable";

export const CUSTOMER_INTENT_VERSION = "GLOW-CUSTOMER-INTENT-V1.0";
export const RECOMMENDATION_CONTEXT_VERSION = "GLOW-RECOMMENDATION-CONTEXT-V1.0";
export const OUTCOME_VERSION = "GLOW-OUTCOME-V1.0";

const GOAL_DIMENSIONS = {
  overall_appearance: ["radiance","evenness","texture","hydration_appearance","overall_vitality","under_eye_appearance"],
  hydration_radiance: ["hydration_appearance","radiance"],
  uneven_tone: ["evenness","radiance"],
  skin_texture: ["texture","radiance"],
  under_eye: ["under_eye_appearance"],
  better_routine: ["hydration_appearance","texture","evenness"],
  curious: []
};
const CONCERN_DIMENSIONS = {
  radiance_dullness:["radiance"], hydration_appearance:["hydration_appearance"], uneven_skin_tone:["evenness"],
  texture:["texture"], under_eye_appearance:["under_eye_appearance"], overall_vitality:["overall_vitality"],
  fine_lines_visible_ageing:["texture","evenness","under_eye_appearance"], not_sure:[]
};
const LABELS={radiance:"Radiance",hydration_appearance:"Hydration",evenness:"Evenness",texture:"Texture",under_eye_appearance:"Under-eye appearance",overall_vitality:"Vitality"};
const GOAL_LABELS={overall_appearance:"overall appearance",hydration_radiance:"hydration and radiance",uneven_tone:"more even-looking skin",skin_texture:"skin texture",under_eye:"under-eye appearance",better_routine:"a better routine",curious:"understanding my Glow"};
const CONCERN_LABELS={radiance_dullness:"radiance or dullness",hydration_appearance:"hydration",uneven_skin_tone:"uneven-looking skin tone",texture:"texture",under_eye_appearance:"under-eye appearance",overall_vitality:"overall vitality",fine_lines_visible_ageing:"fine lines or visible ageing",not_sure:"an area to explore"};
function arr(v){return Array.isArray(v)?v:[];}
function labelDimension(d){return LABELS[d]||String(d||"").replace(/_/g," ").replace(/\b\w/g,m=>m.toUpperCase());}
function labelGoal(g){return GOAL_LABELS[g]||String(g||"").replace(/_/g," ");}
function labelConcern(c){return CONCERN_LABELS[c]||String(c||"").replace(/_/g," ");}
function unique(v){return [...new Set(arr(v).filter(Boolean))];}
function observedDimensions(analysis){return arr(analysis?.top3).map(x=>({dimension:x.dimension,score:Number(x.score)||0,label:labelDimension(x.dimension)}));}
function intentDimensions(survey){return unique([...(GOAL_DIMENSIONS[survey?.primary_goal]||[]),...arr(survey?.concerns).flatMap(x=>CONCERN_DIMENSIONS[x]||[])]);}
function alignment(survey,analysis){
  if(!survey||!analysis)return {status:"UNKNOWN",confidence:"LOW",intentDimensions:[],observedDimensions:[]};
  const intent=intentDimensions(survey), observed=observedDimensions(analysis), observedKeys=observed.map(x=>x.dimension);
  const overlap=intent.filter(x=>observedKeys.includes(x));
  const primaryKeys=GOAL_DIMENSIONS[survey.primary_goal]||[], primaryOverlap=primaryKeys.filter(x=>observedKeys.includes(x));
  const status=primaryOverlap.length?"ALIGNED":overlap.length?"MIXED":"DIFFERENT";
  const confidence=primaryOverlap.length?"HIGH":overlap.length?"STANDARD":"LOW";
  return {status,confidence,intentDimensions:intent.map(labelDimension),observedDimensions:observed,overlap:overlap.map(labelDimension),primaryOverlap:primaryOverlap.map(labelDimension)};
}
function buildInsights(survey,analysis,profile){
  const top=observedDimensions(analysis), primary=labelGoal(survey?.primary_goal);
  const concerns=arr(survey?.concerns).filter(x=>x!=="not_sure").slice(0,4).map(labelConcern);
  const first=top[0];
  const told=("You told us your main goal is "+primary+".");
  const concernText=concerns.length?("You also highlighted "+concerns.join(", ")+"." ):"";
  const observed=first?("Your Glow Check identified "+first.label+" as your current highest-priority visible dimension at "+first.score+"/100."):"Your Glow Check provided a current visible-appearance profile.";
  let therefore;
  if(profile.alignment_status==="ALIGNED") therefore="That gives GLOW a clear signal to keep "+primary+" central when explaining your routine and recommendations.";
  else if(profile.alignment_status==="MIXED") therefore="Your stated goals and the strongest Glow Check priorities overlap, but they are not identical. GLOW will keep your stated goal in context while using the observed priorities to shape recommendations.";
  else if(profile.alignment_status==="DIFFERENT") therefore="Your stated goal and the strongest Glow Check priorities are different. GLOW will not overwrite either signal; it will use your goal for intent and the Glow Check for visible-priority context.";
  else therefore="GLOW will use your stated goal and observed Glow priorities as separate signals.";
  return {version:CUSTOMER_INTENT_VERSION,told:[told,concernText].filter(Boolean),observed:[observed],therefore:[therefore],alignment:profile.alignment_status,confidence:profile.confidence_level};
}

export async function getCustomerProfile(journeyId){
  const j=(await db.query("SELECT id,journey_id,session_id,payment_status,initial_assessment_id,initial_analysis_json,initial_score,day30_assessment_id,day30_score,day30_completed,day30_analysis_json FROM glow_journeys WHERE journey_id=$1 LIMIT 1",[journeyId])).rows[0];
  if(!j)return null;
  const survey=(await db.query("SELECT survey_id,journey_id,session_id,language,locale,primary_goal,age_range,concerns,routine_level,skincare_confidence,acquisition_source,referrer,utm_source,utm_medium,utm_campaign,utm_content,utm_term,rewardful_referral,created_at FROM client_survey_responses WHERE journey_id=$1 OR session_id=$2 ORDER BY created_at DESC LIMIT 1",[journeyId,j.session_id])).rows[0]||null;
  const products=(await db.query("SELECT id,product_name,brand,category,format,fit_score,safety_level,effectiveness_level,suitability_level,fit_reasons,cautions,best_for,avoid_if,routine_role,application,scan_confidence FROM glow15_products WHERE journey_id=$1 ORDER BY fit_score DESC NULLS LAST,updated_at DESC",[journeyId])).rows;
  const preferences=(await db.query("SELECT monthly_budget_gbp FROM glow15_preferences WHERE journey_id=$1 LIMIT 1",[journeyId])).rows[0]||null;
  const routine=(await db.query("SELECT monthly_budget_gbp,routine_json,updated_at FROM glow15_routines WHERE journey_id=$1 LIMIT 1",[journeyId])).rows[0]||null;
  const wishlist=(await db.query("SELECT id,title,brand,category,tier,estimated_price_gbp,reason,source_product_id,metadata,created_at FROM glow15_wishlist WHERE journey_id=$1 ORDER BY created_at DESC",[journeyId])).rows;
  const events=(await db.query("SELECT recommendation_id,product_id,event_type,source,metadata,created_at FROM glow16_recommendation_events WHERE journey_id=$1 ORDER BY created_at DESC LIMIT 200",[journeyId])).rows;
  const analysis=j.initial_analysis_json||{}, align=alignment(survey,analysis);
  const profile={version:CUSTOMER_INTENT_VERSION,journeyId:j.journey_id,
    survey:survey?{surveyId:survey.survey_id,primaryGoal:survey.primary_goal,primaryGoalLabel:labelGoal(survey.primary_goal),ageRange:survey.age_range,concerns:arr(survey.concerns),concernLabels:arr(survey.concerns).map(labelConcern),routineLevel:survey.routine_level,skincareConfidence:survey.skincare_confidence,language:survey.language,locale:survey.locale,acquisitionSource:survey.acquisition_source,referrer:survey.referrer,utm:{source:survey.utm_source,medium:survey.utm_medium,campaign:survey.utm_campaign,content:survey.utm_content,term:survey.utm_term},rewardfulReferral:survey.rewardful_referral}:null,
    observed:{overallScore:Number(j.initial_score||analysis.overall_score||0),top3:observedDimensions(analysis),archetype:analysis.archetype||null,analysis},
    shelf:{count:products.length,products},routine:{budget:Number(routine?.monthly_budget_gbp||preferences?.monthly_budget_gbp||50),saved:routine?.routine_json||null},wishlist,
    journey:{paymentStatus:j.payment_status||null,day30Completed:Boolean(j.day30_completed),day30Score:j.day30_score,day30Analysis:j.day30_analysis_json||null},recommendationEvents:events,alignmentStatus:align.status,confidenceLevel:align.confidence,alignment:align};
  profile.insights=buildInsights(survey,analysis,{alignment_status:align.status,confidence_level:align.confidence});
  return profile;
}

export function recommendationContext(profile){
  const survey=profile?.survey, observed=profile?.observed?.top3||[], intent=intentDimensions(survey||{}), primaryDims=GOAL_DIMENSIONS[survey?.primaryGoal]||[], priorityIndex=new Map(observed.map((x,i)=>[x.dimension,i]));
  return {version:RECOMMENDATION_CONTEXT_VERSION,primaryGoal:survey?.primaryGoal||null,primaryGoalLabel:survey?.primaryGoalLabel||null,intentDimensions:intent,primaryDimensions:primaryDims,observedTop3:observed,alignment:profile?.alignmentStatus||"UNKNOWN",confidence:profile?.confidenceLevel||"LOW",
    scoreRole:(role)=>{const roleMap={cleanser:["hydration_appearance","texture"],moisturizer:["hydration_appearance","texture"],sunscreen:["evenness","radiance"],toner:["hydration_appearance"],eye_care:["under_eye_appearance","under_eye"],serum:["radiance","hydration_appearance","evenness","texture"],treatment:["radiance","evenness","texture"],exfoliant:["texture","evenness"],mask:["hydration_appearance","radiance"],oil:["hydration_appearance","radiance"]};const dims=roleMap[role]||[],primaryHit=dims.some(d=>primaryDims.includes(d)),intentHit=dims.some(d=>intent.includes(d)),observedHits=dims.filter(d=>priorityIndex.has(d)).map(d=>priorityIndex.get(d)),observedBoost=observedHits.length?Math.max(0,3-Math.min(...observedHits)):0;return (primaryHit?12:0)+(intentHit?6:0)+observedBoost;},
    reason:(role,basis,source)=>{const primary=survey?.primaryGoalLabel;const sourceScore=source?.fit_score;if(basis==="LOW_FIT"&&source)return "You told us your goal is "+(primary||"a more personalised Glow")+"; your current "+source.product_name+" has a Glow Fit Score of "+sourceScore+"/100, so GLOW is considering a better-fitting option for this role.";if(basis==="GAP")return "You told us your goal is "+(primary||"a more personalised Glow")+", and your current Glow Shelf has a gap in this routine role.";return "This recommendation is being considered in the context of your stated goal"+(primary?(" of "+primary):"")+" and your Glow Check priorities.";}};
}

export async function saveProfile(journeyId){
  const profile=await getCustomerProfile(journeyId); if(!profile)return null;
  await db.query("INSERT INTO glow16_intelligence_profiles (journey_id,survey_id,profile_json,alignment_status,confidence_level,profile_version) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (journey_id) DO UPDATE SET survey_id=$2,profile_json=$3,alignment_status=$4,confidence_level=$5,profile_version=$6,updated_at=now()",[journeyId,profile.survey?.surveyId||null,JSON.stringify(profile),profile.alignmentStatus,profile.confidenceLevel,CUSTOMER_INTENT_VERSION]);
  return profile;
}
export async function incrementDailyMetric(metric){
  const allowed=["survey_started","survey_completed","survey_to_journey","journeys_paid","recommendation_shown","recommendation_clicked","recommendation_wishlisted","recommendation_purchased","day30_completed"];
  if(!allowed.includes(metric))return;
  await db.query("INSERT INTO glow16_analytics_daily (metric_date,"+metric+") VALUES (CURRENT_DATE,1) ON CONFLICT (metric_date) DO UPDATE SET "+metric+"=glow16_analytics_daily."+metric+"+1,updated_at=now()");
}

export async function recordRecommendationEvent({journeyId,recommendationId,productId,eventType,source="glow15",metadata={}}){
  const allowed=["SHOWN","CLICKED","WISHLISTED","REMOVED","PURCHASED","DISMISSED"]; if(!allowed.includes(eventType))throw new Error("Invalid recommendation event.");
  await db.query("INSERT INTO glow16_recommendation_events (journey_id,recommendation_id,product_id,event_type,source,metadata) VALUES ($1,$2,$3,$4,$5,$6)",[journeyId,recommendationId,productId||null,eventType,source,JSON.stringify(metadata||{})]);
  const metric={SHOWN:"recommendation_shown",CLICKED:"recommendation_clicked",WISHLISTED:"recommendation_wishlisted",PURCHASED:"recommendation_purchased"}[eventType];
  if(metric)await incrementDailyMetric(metric);
}
export async function recordDay30Outcome(journeyId,initialAssessmentId,day30AssessmentId,initialScore,day30Score){
  const initial=(await db.query("SELECT dimension,score FROM glow_dimension_scores WHERE assessment_id=$1",[initialAssessmentId])).rows, day30=(await db.query("SELECT dimension,score FROM glow_dimension_scores WHERE assessment_id=$1",[day30AssessmentId])).rows;
  const a=new Map(initial.map(x=>[x.dimension,Number(x.score)])), b=new Map(day30.map(x=>[x.dimension,Number(x.score)])), dimensionDeltas={};
  for(const [dimension,score] of b)dimensionDeltas[dimension]=score-(a.get(dimension)||score);
  const events=(await db.query("SELECT event_type,count(*)::int AS count FROM glow16_recommendation_events WHERE journey_id=$1 GROUP BY event_type",[journeyId])).rows, eventSummary=Object.fromEntries(events.map(x=>[x.event_type,x.count]));
  const delta=Number(day30Score)-Number(initialScore), movement=delta>=8?"SIGNIFICANT_MOVEMENT":delta>=3?"POSITIVE_MOVEMENT":delta<=-8?"DOWNWARD_MOVEMENT":delta<0?"VISIBLE_MOVEMENT":"STEADY";
  const outcome={overallDelta:delta,movement,dimensionDeltas,recommendationEvents:eventSummary,interpretation:"Outcome tracking records change in Glow scores alongside recommendation engagement. It does not establish that a recommendation caused the change."};
  await db.query("INSERT INTO glow16_outcomes (journey_id,initial_assessment_id,day30_assessment_id,initial_score,day30_score,overall_delta,dimension_deltas,recommendation_events_summary,outcome_json,outcome_version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (journey_id) DO UPDATE SET day30_assessment_id=$3,day30_score=$5,overall_delta=$6,dimension_deltas=$7,recommendation_events_summary=$8,outcome_json=$9,outcome_version=$10,updated_at=now()",[journeyId,initialAssessmentId,day30AssessmentId,Number(initialScore),Number(day30Score),delta,JSON.stringify(dimensionDeltas),JSON.stringify(eventSummary),JSON.stringify(outcome),OUTCOME_VERSION]);
  return outcome;
}
export { labelDimension, labelGoal, labelConcern, alignment };