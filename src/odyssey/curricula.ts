import type {Curriculum,Resource,Topic,OntologySkill} from './types';
import {normalize} from './catalogue';
export const resources:Record<string,Resource>={
 python:{title:'Python tutorial',url:'https://docs.python.org/3/tutorial/',kind:'free-material',note:'Official documentation; learning material, not a credential.'},
 algorithms:{title:'MIT OpenCourseWare: Introduction to Algorithms',url:'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/',kind:'free-material',note:'Open course materials; participation does not confer MIT credit.'},
 linear:{title:'MIT OpenCourseWare: Linear Algebra',url:'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/',kind:'free-material',note:'Open learning materials. Check the source for licensing and prerequisites.'},
 stats:{title:'OpenStax: Introductory Statistics',url:'https://openstax.org/details/books/introductory-statistics-2e',kind:'free-material',note:'Open textbook; no accreditation is implied.'},
 numpy:{title:'NumPy learning resources',url:'https://numpy.org/learn/',kind:'free-material',note:'Official project documentation.'},
 pandas:{title:'pandas getting started',url:'https://pandas.pydata.org/docs/getting_started/',kind:'free-material',note:'Official project documentation.'},
 sql:{title:'PostgreSQL tutorial',url:'https://www.postgresql.org/docs/current/tutorial.html',kind:'free-material',note:'Official database documentation.'},
 ml:{title:'scikit-learn user guide',url:'https://scikit-learn.org/stable/user_guide.html',kind:'free-material',note:'Official methods and model-evaluation documentation.'},
 torch:{title:'PyTorch tutorials',url:'https://pytorch.org/tutorials/',kind:'free-material',note:'Official tutorials; check software and hardware requirements.'},
 hf:{title:'Hugging Face learning',url:'https://huggingface.co/learn',kind:'free-material',note:'Public learning material; external hosted services may have separate costs.'},
 mlops:{title:'MLflow documentation',url:'https://mlflow.org/docs/latest/',kind:'free-material',note:'Open-source tracking and model lifecycle documentation.'},
 git:{title:'Git book',url:'https://git-scm.com/book/en/v2',kind:'free-material',note:'Officially hosted open book.'},
 security:{title:'OWASP Machine Learning Security Top 10',url:'https://owasp.org/www-project-machine-learning-security-top-10/',kind:'official-reference',note:'Security guidance, not a compliance certificate.'},
 responsible:{title:'NIST AI Risk Management Framework',url:'https://www.nist.gov/itl/ai-risk-management-framework',kind:'official-reference',note:'Risk framework; applicability depends on context and jurisdiction.'},
 econ:{title:'OpenStax: Principles of Economics',url:'https://openstax.org/details/books/principles-economics-3e',kind:'free-material',note:'Open textbook. This pathway does not award a degree.'},
 core:{title:'CORE Econ: public learning resources',url:'https://www.core-econ.org/',kind:'free-material',note:'Public economics learning resources; check specific resource terms.'},
 research:{title:'GOV.UK: user research',url:'https://www.gov.uk/service-manual/user-research',kind:'official-reference',note:'Public methodology guidance, not evidence of employment experience.'},
 appraisal:{title:'HM Treasury: Green Book',url:'https://www.gov.uk/government/publications/the-green-book-appraisal-and-evaluation-in-central-government',kind:'official-reference',note:'UK appraisal guidance; not a universal policy or legal requirement.'},
 evaluation:{title:'Magenta Book evaluation guidance',url:'https://www.gov.uk/government/publications/the-magenta-book',kind:'official-reference',note:'UK evaluation guidance; confirm applicability to the setting.'},
 politics:{title:'OpenStax: Introduction to Political Science',url:'https://openstax.org/details/books/introduction-political-science',kind:'free-material',note:'Open educational textbook.'},
 writing:{title:'Purdue OWL: research and citation',url:'https://owl.purdue.edu/owl/research_and_citation/',kind:'free-material',note:'Public writing guidance; link rather than republish material.'},
 design:{title:'GOV.UK: service design',url:'https://www.gov.uk/service-manual/design',kind:'official-reference',note:'Public design guidance. No professional equivalence is asserted.'},
 agile:{title:'The Scrum Guide',url:'https://scrumguides.org/scrum-guide.html',kind:'free-material',note:'Read the official guide; this app does not issue Scrum certification.'},
 accessibility:{title:'W3C: accessibility fundamentals',url:'https://www.w3.org/WAI/fundamentals/',kind:'official-reference',note:'Accessibility guidance; a practice quiz is not a conformance audit.'},
 analytics:{title:'Google Analytics learning documentation',url:'https://developers.google.com/analytics/learn',kind:'free-material',note:'Official learning material; third-party tools have independent terms.'},
 openlearn:{title:'Open University OpenLearn',url:'https://www.open.edu/openlearn/',kind:'free-material',note:'Browse public materials; formal qualifications have separate admission and cost requirements.'}
};
type Row=[string,string,string,string,string,string?];
function make(id:string,title:string,terms:string[],families:[string,string,string][],rows:Row[]):Curriculum{
 return {id,title,occupationTerms:terms,families:families.map(([id,label,summary])=>({id,label,summary})),topics:rows.map(([id,label,family,prereq,key,summary])=>({id:'topic:'+id,label,family,stage:families.findIndex(f=>f[0]===family),prerequisites:prereq?prereq.split(',').map(p=>'topic:'+p):[],source:resources[key].url,provenance:'resource-derived',resources:[resources[key]],effort:prereq?'intermediate':'introductory',summary:summary||`Develop ${label.toLowerCase()} through the linked reference, practical work and review. Keep a record of assumptions, decisions and limitations.`,skillIds:[]}))};
}
export const aiCurriculum=make('ai-engineering','AI & machine-learning engineering',['artificial intelligence','machine learning','data scientist','intelligent systems'],[
 ['foundations','Programming foundations','Write reliable programs before combining data and models.'],['math','Mathematics & reasoning','Understand the structures and uncertainty behind model behavior.'],['data','Data systems','Build trustworthy datasets and reproducible analysis.'],['models','Machine-learning methods','Choose, train and evaluate methods for the actual task.'],['deep','Deep learning & language','Understand neural models and their limitations.'],['delivery','Production & operations','Deploy observable systems with deliberate safeguards.'],['specialise','Specializations & portfolio','Explore independent branches and demonstrate evidence.']
],[
 ['python','Python foundations','foundations','','python','Use functions, collections, exceptions and modules to turn a problem into a testable program.'],
 ['types','Data structures','foundations','python','algorithms','Choose collections around access patterns and check the cost of operations.'],
 ['algorithms','Algorithms & complexity','foundations','types','algorithms','Compare algorithms using correctness arguments and time/space trade-offs.'],
 ['git','Version control','foundations','','git','Record understandable changes and reproduce a known version of your work.'],
 ['tests','Testing & reproducibility','foundations','python,git','python','Check transformations and edge cases; pin the environment needed to reproduce results.'],
 ['linear','Vectors & matrices','math','','linear','Represent linear relationships and reason about dimensions, rank and transformations.'],
 ['calculus','Optimization foundations','math','linear','ml','Interpret gradients, loss functions and how an optimizer changes model parameters.'],
 ['probability','Probability & uncertainty','math','','stats','Reason about conditional probability, sampling and uncertainty without treating a score as certainty.'],
 ['statistics','Statistical inference','math','probability','stats','Distinguish a sample statistic from a population claim and report assumptions.'],
 ['experiment','Experimental design','math','statistics','stats','Define a testable question, comparison and measurement plan before analyzing results.'],
 ['numpy','Numerical computing','data','python,linear','numpy','Use array operations and inspect shapes, precision and numerical stability.'],
 ['pandas','Data manipulation','data','python','pandas','Join, reshape and summarize records while preserving provenance and missing values.'],
 ['sql','Relational data & SQL','data','','sql','Model relationships and query datasets with constraints and validated joins.'],
 ['cleaning','Data quality','data','pandas,sql','pandas','Identify invalid values, duplication, missingness and leakage before modeling.'],
 ['features','Feature preparation','data','cleaning,numpy','ml','Fit transformations using training data only and preserve the complete pipeline.'],
 ['visuals','Exploratory analysis','data','statistics,pandas','pandas','Use plots and summaries to test assumptions and identify data limitations.'],
 ['baseline','Problem framing & baselines','models','statistics,cleaning','ml','Define the task, comparison baseline and success criteria with stakeholders.'],
 ['supervised','Supervised learning','models','features,baseline','ml','Fit and compare supervised methods with a defensible train/validation design.'],
 ['unsupervised','Unsupervised learning','models','features','ml','Explore structure without assuming clusters represent objective human categories.'],
 ['evaluation','Model evaluation','models','supervised,experiment','ml','Select task-relevant metrics, inspect error slices and compare uncertainty.'],
 ['validation','Validation & leakage','models','evaluation','ml','Choose split strategies that reflect deployment, including time or grouped records.'],
 ['tuning','Hyperparameter search','models','validation','ml','Bound the search budget and keep evaluation separate from model selection.'],
 ['explain','Model interpretation','models','evaluation','ml','Explain model behavior while distinguishing association, attribution and causal claims.'],
 ['neural','Neural-network foundations','deep','linear,calculus,supervised','torch','Trace tensors, layers, losses and optimization through a small neural model.'],
 ['training','Deep-learning training','deep','neural,tests','torch','Monitor overfitting, data order, checkpoints and computational requirements.'],
 ['nlp','Natural language processing','deep','training','hf','Compare representations and test language tasks for bias, failure and domain shift.'],
 ['vision','Computer vision','deep','training','torch','Inspect image preprocessing, labels, model errors and robustness.'],
 ['transformers','Transformer concepts','deep','nlp,linear','hf','Understand attention, tokenization and context limits before selecting a language model.'],
 ['retrieval','Retrieval & grounding','deep','transformers,sql','hf','Retrieve relevant evidence, evaluate retrieval quality and preserve citations.'],
 ['serving','Model serving','delivery','evaluation,tests','mlops','Expose a versioned prediction boundary with validation, timeouts and rollback.'],
 ['tracking','Experiment tracking','delivery','git,supervised','mlops','Record datasets, code, parameters and outcomes without leaking sensitive data.'],
 ['monitoring','Monitoring & drift','delivery','serving,statistics','mlops','Watch input changes, system failures and outcomes with an explicit response plan.'],
 ['pipelines','Data & model pipelines','delivery','tracking,cleaning','mlops','Separate repeatable transformations from training and deployment decisions.'],
 ['security','AI system security','delivery','serving','security','Threat-model uploaded content, model interfaces, dependencies and data access.'],
 ['responsible','Responsible AI & governance','delivery','evaluation','responsible','Document intended use, affected people, limitations and escalation routes.'],
 ['privacy','Privacy & data minimization','delivery','cleaning','responsible','Limit data collection and retention; obtain permission before external processing.'],
 ['cost','Compute & cost constraints','delivery','training,serving','mlops','Measure resource use and choose an acceptable latency, quality and budget trade-off.'],
 ['ai-project','End-to-end model project','specialise','validation,serving,responsible','mlops','Create a reproducible project from problem framing to deployment and a candid model report.'],
 ['nlp-project','Language-system specialization','specialise','retrieval,security','hf','Evaluate a grounded language application with retrieval, failure tests and source attribution.'],
 ['vision-project','Vision specialization','specialise','vision,evaluation','torch','Demonstrate a vision task using a documented dataset and error analysis.'],
 ['research-branch','Research pathway','specialise','experiment,neural','openlearn','Explore published methods and further study. Admission and research-role requirements need separate official checks.']
]);
export const policyCurriculum=make('policy-economics','Policy & economic analysis',['economist','policy','political','public affairs','economic researcher','international development'],[
 ['context','Institutions & economic context','Understand the question, institutions and affected communities.'],['methods','Research & quantitative methods','Build a defensible evidence base.'],['analysis','Analysis & evaluation','Compare explanations and policy choices.'],['delivery','Advice & implementation','Translate findings into accountable decisions.'],['specialise','Specializations & onward study','Independent directions for deeper inquiry.']
],[
 ['micro','Microeconomic reasoning','context','','econ','Analyze incentives, constraints and trade-offs without assuming every market works identically.'],
 ['macro','Macroeconomic systems','context','','econ','Connect aggregate measures, institutions and policy choices while recognizing model limits.'],
 ['institutions','Political institutions','context','','politics','Describe how authority, accountability and implementation differ across institutions.'],
 ['ethics','Ethics & public value','context','','politics','Make the distribution of benefits, harms and public values explicit.'],
 ['policy-question','Policy problem definition','context','institutions','appraisal','Separate the observed problem, proposed explanation and desired outcome.'],
 ['literature','Literature & source evaluation','methods','','writing','Compare credible sources and record publication context, evidence quality and conflicts.'],
 ['qualitative','Qualitative research','methods','policy-question','research','Plan ethical interviews or observation and preserve consent and anonymized notes.'],
 ['survey','Survey & sampling design','methods','policy-question','stats','Choose a sampling strategy and inspect nonresponse, question framing and coverage.'],
 ['policy-stats','Statistics for social research','methods','','stats','Interpret distributions, uncertainty and association in social and economic data.'],
 ['policy-data','Data cleaning & documentation','methods','policy-stats','pandas','Preserve sources, document transformations and distinguish missing data from zero.'],
 ['policy-sql','Administrative data & SQL','methods','policy-data','sql','Query linked administrative records without violating purpose or access boundaries.'],
 ['econometrics','Econometric foundations','methods','policy-stats,micro','core','Relate model assumptions, estimation choices and uncertainty to the substantive question.'],
 ['causal','Causal reasoning','analysis','econometrics,policy-question','evaluation','Distinguish a causal claim from a correlation and identify necessary assumptions.'],
 ['counterfactual','Counterfactuals & comparison groups','analysis','causal','evaluation','Explain what would have happened without an intervention and why a comparison is credible.'],
 ['evaluation-design','Programme evaluation','analysis','counterfactual,survey','evaluation','Choose evaluation questions and methods appropriate to the programme and available evidence.'],
 ['appraisal','Options appraisal','analysis','micro,policy-question','appraisal','Compare options against objectives, risks and distributional effects.'],
 ['cost-benefit','Cost-benefit & cost-effectiveness','analysis','appraisal,policy-stats','appraisal','State valuation assumptions and uncertainty; do not invent prices or claim universal applicability.'],
 ['distribution','Distributional analysis','analysis','ethics,appraisal','appraisal','Identify whose outcomes differ and which groups are missing from the evidence.'],
 ['scenario','Scenario & sensitivity analysis','analysis','cost-benefit','appraisal','Test whether recommendations change under plausible assumptions and uncertainty.'],
 ['comparative','Comparative policy analysis','analysis','institutions,literature','politics','Compare institutional contexts before transferring a policy conclusion.'],
 ['stakeholders','Stakeholder engagement','delivery','qualitative,ethics','research','Identify affected parties and document how their input changes the analysis.'],
 ['brief','Policy brief writing','delivery','appraisal,literature','writing','Present the problem, options, evidence, uncertainty and recommendation concisely.'],
 ['visual-policy','Communicating uncertainty','delivery','policy-stats','stats','Use clear charts and words to show uncertainty rather than hide it behind a single number.'],
 ['implementation','Implementation planning','delivery','stakeholders,brief','appraisal','Identify responsibilities, dependencies, operational risks and review points.'],
 ['monitor-policy','Monitoring indicators','delivery','evaluation-design,implementation','evaluation','Connect indicators to outcomes and avoid treating easy-to-measure activity as impact.'],
 ['academic-writing','Academic argument & citation','delivery','literature','writing','Build a traceable argument and distinguish your interpretation from quoted evidence.'],
 ['economic-paper','Economic research project','specialise','econometrics,academic-writing','core','Produce a reproducible research report with data provenance, methods and limitations.'],
 ['policy-project','Policy evaluation portfolio','specialise','evaluation-design,brief','evaluation','Build a reviewed evaluation plan and a public-facing fictional or authorized case study.'],
 ['development','International development','specialise','comparative,distribution','openlearn','Explore development debates and context-specific evidence; programme eligibility is not inferred.'],
 ['risk','Political risk analysis','specialise','comparative,scenario','politics','Construct scenarios from explicit sources, with uncertainty and competing explanations.'],
 ['public-affairs','Public affairs pathway','specialise','stakeholders,brief','politics','Develop transparent communication and engagement work with professional ethical boundaries.'],
 ['postgraduate','Further education & research','specialise','academic-writing,economic-paper','openlearn','Compare official programme curricula and entry criteria. A learning pathway does not confer admission.']
]);
export const productCurriculum=make('product-strategy','Product management & service strategy',['product manager','product owner','business analyst','management consultant','service designer','user experience','user interface designer'],[
 ['discovery','People & problem discovery','Identify a valuable problem with evidence.'],['strategy','Strategy & business context','Connect customer needs to sustainable outcomes.'],['design','Design & delivery','Turn options into testable, accessible experiences.'],['measure','Measurement & learning','Use evidence to decide what to change.'],['leadership','Leadership & onward directions','Develop influence and independent specializations.']
],[
 ['user-research','User research foundations','discovery','','research','Choose a research question, recruit responsibly and distinguish findings from assumptions.'],
 ['interview','Interviewing & observation','discovery','user-research','research','Use neutral questions, document consent and preserve an anonymized evidence trail.'],
 ['synthesis','Research synthesis','discovery','interview','research','Organize observations into supported findings while retaining contradictory evidence.'],
 ['problem-framing','Problem framing','discovery','synthesis','design','Define the person, problem, context and consequence before committing to a solution.'],
 ['journey','Journey & service mapping','discovery','synthesis','design','Map the service experience and identify handoffs, friction and missing evidence.'],
 ['market','Market & contextual research','strategy','problem-framing','openlearn','Compare alternatives and constraints using dated sources, not invented market sizes.'],
 ['value','Value propositions','strategy','market','openlearn','State which user problem is addressed and what evidence would support the value claim.'],
 ['business','Business-model reasoning','strategy','value','econ','Examine incentives, costs and sustainability without fabricating revenue forecasts.'],
 ['prioritization','Prioritization & trade-offs','strategy','value,problem-framing','design','Compare options against explicit objectives and constraints rather than an unexplained score.'],
 ['outcomes','Outcome-oriented roadmaps','strategy','prioritization','design','Connect intended outcomes, hypotheses and learning milestones instead of promising a fixed feature list.'],
 ['technical','Technical systems literacy','strategy','','python','Understand interfaces, data flows and failure boundaries well enough to discuss trade-offs.'],
 ['requirements','Requirements & acceptance criteria','design','problem-framing,technical','agile','Write testable requirements, assumptions and acceptance criteria in clear language.'],
 ['prototyping','Prototyping','design','journey','design','Choose a prototype fidelity that answers the current question without unnecessary implementation.'],
 ['usability','Usability testing','design','prototyping,interview','research','Observe representative tasks and separate observed behavior from preferences.'],
 ['inclusive','Inclusive & accessible design','design','prototyping','accessibility','Include disabled users and check keyboard, screen-reader and visual access.'],
 ['delivery','Iterative delivery','design','requirements','agile','Break work into observable increments with a review and feedback mechanism.'],
 ['dependencies','Dependencies & risk','design','delivery,technical','agile','Surface dependencies and failure modes before committing to a delivery sequence.'],
 ['product-sql','Product data & SQL','measure','','sql','Query behavior and outcome data with validated definitions and access controls.'],
 ['metrics','Metric definitions','measure','outcomes,product-sql','analytics','Define events and denominators, and separate user value from vanity metrics.'],
 ['experiments','Product experiments','measure','metrics','stats','Specify a hypothesis, comparison, guardrail and decision rule before analysis.'],
 ['product-stats','Statistical reasoning','measure','','stats','Understand sampling variability and avoid interpreting noise as a product effect.'],
 ['measurement','Experiment evaluation','measure','experiments,product-stats','stats','Evaluate results, uncertainty and unintended effects before recommending rollout.'],
 ['privacy-product','Privacy by design','measure','metrics','responsible','Minimize collection, explain processing and plan retention and deletion.'],
 ['stakeholder-product','Stakeholder alignment','leadership','outcomes','agile','Make disagreements, decision ownership and trade-offs visible rather than hiding them in a roadmap.'],
 ['communication','Decision narratives','leadership','measurement,stakeholder-product','writing','Explain a decision with its evidence, alternatives and remaining uncertainty.'],
 ['facilitation','Facilitation & collaboration','leadership','stakeholder-product','research','Design collaborative sessions around a decision and include different perspectives.'],
 ['launch','Launch & operational readiness','leadership','dependencies,privacy-product','design','Check support, accessibility, monitoring and rollback before releasing a service.'],
 ['product-case','Product case-study portfolio','leadership','usability,measurement,communication','design','Show a problem-to-outcome narrative with artifacts and honest evidence limits.'],
 ['technical-product','Technical product specialization','leadership','technical,dependencies','openlearn','Explore platform and API products through architecture and user-facing constraints.'],
 ['service-product','Public-service product pathway','leadership','inclusive,privacy-product','design','Explore service design and public value; inspect actual role-specific requirements.'],
 ['strategy-role','Strategy & consulting pathway','leadership','business,communication','openlearn','Compare related occupations through shared requirements, not a guaranteed promotion ladder.']
]);
export const curricula=[aiCurriculum,policyCurriculum,productCurriculum];
export function curriculumFor(label:string,aliases:string[]=[]){const text=normalize(label+' '+aliases.join(' '));return curricula.find(c=>c.occupationTerms.some(t=>text.includes(normalize(t))))||null;}
// Editorial topic-to-source crosswalk. This links relevant evidence for inspection;
// it does not assert a course, project or topic satisfies a formal qualification.
const crosswalk:Record<string,string[]>={
 'topic:python':['Python (computer programming)'],'topic:sql':['SQL','PostgreSQL'],'topic:policy-sql':['SQL'],'topic:product-sql':['SQL'],
 'topic:micro':['microeconomics','economics'],'topic:macro':['macroeconomics','economics'],'topic:econometrics':['econometrics','apply statistical analysis techniques'],
 'topic:policy-stats':['apply statistical analysis techniques','statistics'],'topic:statistics':['statistics','apply statistical analysis techniques'],
 'topic:institutions':['political science','politics'],'topic:literature':['conduct literature research'],'topic:academic-writing':['draft scientific or academic papers and technical documentation'],
 'topic:policy-data':['perform data analysis'],'topic:visuals':['perform data analysis'],'topic:ethics':['ethics'],'topic:policy-question':['analyse policy'],
 'topic:prioritization':['project management principles'],'topic:delivery':['Agile project management','project management'],'topic:user-research':["assess users' interaction with ICT applications"],
 'topic:inclusive':['ICT accessibility standards'],'topic:linear':['linear algebra'],'topic:neural':['artificial neural networks'],'topic:ml':['machine learning']
};
export function linkTopics(curriculum:Curriculum,skills:OntologySkill[]):Topic[]{return curriculum.topics.map(t=>({...t,skillIds:skills.filter(s=>{const a=normalize(s.label),b=normalize(t.label);return a===b||s.aliases.some(x=>normalize(x)===b)||(crosswalk[t.id]||[]).some(label=>normalize(label)===a);}).map(s=>s.id)}));}
