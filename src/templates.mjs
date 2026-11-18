// The starter catalog is deliberately small, real, and read-only.
// Every tool points to a public upstream endpoint. These are onboarding
// examples, not purported external customers or Marketplace listings.
export const STARTER_TEMPLATES=Object.freeze([
  {
    id:'github_repository',name:'GitHub Repository Reader',category:'Developer tools',
    description:'Inspect a public GitHub repository directly from an AI client.',
    source:'GitHub REST API',sampleArgs:{owner:'Noetfield-Systems',repo:'MCP'},
    tools:[{name:'read_repository',description:'Fetch current public GitHub repository metadata using its owner and name',method:'GET',
      url:'https://api.github.com/repos/{owner}/{repo}',params:[
        {name:'owner',in:'path',type:'string',required:true},
        {name:'repo',in:'path',type:'string',required:true}
      ]}]
  },
  {
    id:'hacker_news',name:'Hacker News Headlines',category:'Public research',
    description:'Read live top-story identifiers from the public Hacker News API.',
    source:'Hacker News Firebase API',sampleArgs:{},
    tools:[{name:'top_story_ids',description:'Retrieve the current Hacker News top-story IDs from the public API',method:'GET',
      url:'https://hacker-news.firebaseio.com/v0/topstories.json',params:[]}]
  },
  {
    id:'github_profile',name:'GitHub Profile Reader',category:'Developer tools',
    description:'Look up public GitHub account metadata by username.',
    source:'GitHub REST API',sampleArgs:{username:'Noetfield-Systems'},
    tools:[{name:'read_github_profile',description:'Get current public GitHub user or organization profile data by login',method:'GET',
      url:'https://api.github.com/users/{username}',params:[
        {name:'username',in:'path',type:'string',required:true}
      ]}]
  }
]);
export function publicTemplates(){
  return STARTER_TEMPLATES.map(({id,name,description,category,source,sampleArgs,tools})=>({id,name,description,category,source,sampleArgs,tool_count:tools.length}));
}
export function findTemplate(id){return STARTER_TEMPLATES.find(t=>t.id===id)||null;}
