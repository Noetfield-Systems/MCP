// The starter catalog is deliberately small, real, and read-only.
// Every tool points to a public upstream endpoint. These are onboarding
// examples, not purported external customers or Marketplace listings.
export const STARTER_TEMPLATES=Object.freeze([
  {
    id:'hacker_news',name:'Hacker News Headlines',category:'Public research',
    description:'Read live top-story identifiers from the public Hacker News API.',
    source:'Hacker News Firebase API',sampleArgs:{},
    tools:[{name:'top_story_ids',description:'Retrieve the current Hacker News top-story IDs from the public API',method:'GET',
      url:'https://hacker-news.firebaseio.com/v0/topstories.json',params:[]}]
  },
  {
    id:'github_repository',name:'GitHub Repository Reader',category:'Developer tools',
    description:'Inspect a public GitHub repository (anonymous API rate limits may apply).',
    source:'GitHub REST API',sampleArgs:{owner:'Noetfield-Systems',repo:'MCP'},
    tools:[{name:'read_repository',description:'Fetch current public GitHub repository metadata using its owner and name',method:'GET',
      url:'https://api.github.com/repos/{owner}/{repo}',params:[
        {name:'owner',in:'path',type:'string',required:true},
        {name:'repo',in:'path',type:'string',required:true}
      ]}]
  },
  {
    id:'github_profile',name:'GitHub Profile Reader',category:'Developer tools',
    description:'Look up public GitHub account metadata by username (anonymous rate limits may apply).',
    source:'GitHub REST API',sampleArgs:{username:'Noetfield-Systems'},
    tools:[{name:'read_github_profile',description:'Get current public GitHub user or organization profile data by login',method:'GET',
      url:'https://api.github.com/users/{username}',params:[
        {name:'username',in:'path',type:'string',required:true}
      ]}]
  },
  {
    id:'dexscreener_market',name:'DEX Screener Market Reader',category:'Onchain data · read-only',
    description:'Inspect current token profiles and search live DEX pairs. Public data only: no wallets, signatures, swaps or trade execution.',
    source:'DEX Screener official public API',source_url:'https://docs.dexscreener.com/api/reference',
    sampleArgs:{q:'SOL/USDC'},
    tools:[
      {name:'latest_token_profiles',description:'Read current published DEX Screener token profiles; market data is not investment advice or identity verification',method:'GET',
        url:'https://api.dexscreener.com/token-profiles/latest/v1',params:[]},
      {name:'search_dex_pairs',description:'Search currently indexed DEX pairs by keyword or token symbols; third-party data, not trading execution',method:'GET',
        url:'https://api.dexscreener.com/latest/dex/search',params:[
          {name:'q',in:'query',type:'string',required:true}
        ]}
    ]
  },
  {
    id:'world_bank_countries',name:'World Bank Country Facts',category:'Business & public data',
    description:'Read official World Bank country metadata via the open Indicators API, with a country code parameter. Educational public data only.',
    source:'World Bank Indicators API',source_url:'https://datahelpdesk.worldbank.org/knowledgebase/articles/898590-country-api-queries',
    sampleArgs:{country:'CA'},
    tools:[
      {name:'country_facts',description:'Read public World Bank country metadata by ISO two-letter country code. May reflect the provider publication schedule.',method:'GET',
        url:'https://api.worldbank.org/v2/country/{country}?format=json',params:[
          {name:'country',in:'path',type:'string',required:true}
        ]}
    ]
  }
]);
export function publicTemplates(){
  return STARTER_TEMPLATES.map(({id,name,description,category,source,source_url,sampleArgs,tools})=>({id,name,description,category,source,source_url:source_url||null,sampleArgs,tool_count:tools.length}));
}
export function findTemplate(id){return STARTER_TEMPLATES.find(t=>t.id===id)||null;}
