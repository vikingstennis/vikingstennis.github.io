const schools={
 Northwest:{venueName:'Northwest High School tennis courts',address:'800 Lafayette Road, Clarksville, TN 37042'},
 'West Creek':{venueName:'West Creek High School',address:'1210 West Creek Coyote Trail, Clarksville, TN 37042'},
 Kenwood:{venueName:'Kenwood High School',address:'251 East Pine Mountain Road, Clarksville, TN 37042'},
 'Dickson County':{venueName:'Dickson County High School',address:'509 Henslee Drive, Dickson, TN 37055'},
 'Henry County':{venueName:'near Henry County High School',address:'315 South Wilson Street, Paris, TN 38242'},
 Northeast:{venueName:'Northeast High School',address:'3701 Trenton Road, Clarksville, TN 37040'},
 Rossview:{venueName:'Rossview High School',address:'1237 Rossview Road, Clarksville, TN 37043'},
 'Christian County':{venueName:'Christian County High School',address:'1 Tiger Way, Hopkinsville, KY 42240'}
};
const fixtures=[
 ['03-01','Rossview','Away','non-district'],['03-02','Northeast','Home','non-district'],
 ['03-04','Northeast','Away','non-district'],['03-08','Rossview','Home','non-district'],
 ['03-09','Henry County','Away','district'],['03-11','Christian County','Away','non-district'],
 ['03-23','West Creek','Home','district'],['03-25','Kenwood','Home','district'],
 ['03-30','West Creek','Away','district'],['04-01','Kenwood','Away','district'],
 ['04-05','Clarksville Academy','Home','non-district'],['04-06','Dickson County','Home','district'],
 ['04-08','Dickson County','Away','district'],['04-13','Henry County','Home','district'],
 ['04-16','Christian County','Home','non-district']
];
export const seasonMatches=['boys','girls'].flatMap(team=>fixtures.map(([day,opponent,venue,matchType])=>({team,opponent,venue,date:'2027-'+day,time:'16:00',timeZone:'America/Chicago',timeStatus:'tentative',locationStatus:'tentative',matchType,...(venue==='Home'?schools.Northwest:schools[opponent]),status:'scheduled'})));
export function schedulesIdentical(matches){
 const rows=team=>matches.filter(match=>match.team===team).map(({team:ignored,...match})=>JSON.stringify(match)).sort();
 const boys=rows('boys'),girls=rows('girls');
 return boys.length===girls.length&&boys.every((match,index)=>match===girls[index]);
}
export function allMatchesConfirmed(matches){return matches.length>0&&matches.every(match=>match.timeStatus==='confirmed'&&match.locationStatus==='confirmed');}
export function validateFixture(match){
 if(!['boys','girls'].includes(match.team)||!['Home','Away'].includes(match.venue)||!/^2027-\d{2}-\d{2}$/.test(match.date)||!/^([01]\d|2[0-1]):[0-5]\d$/.test(match.time)||match.timeZone!=='America/Chicago'||!['tentative','confirmed'].includes(match.timeStatus)||!['tentative','confirmed'].includes(match.locationStatus)||(match.matchType!==undefined&&!['district','non-district'].includes(match.matchType))||!match.venueName?.trim()||!match.address?.trim()||(match.sequence!==undefined&&(!Number.isInteger(match.sequence)||match.sequence<0))||(match.lastModified!==undefined&&!Number.isFinite(Date.parse(match.lastModified))))throw new Error('Invalid fixture fields');
 return match;
}
seasonMatches.forEach(validateFixture);
