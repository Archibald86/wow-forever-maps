"""Bounded public-page reader; source text is data and never executable input."""
from datetime import datetime
import hashlib
from html.parser import HTMLParser
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET

HOSTS={'zephras.com','foreverchanges.pro','www.wowhead.com'}
TYPES={'beast':'Beast','humanoid':'Humanoid','undead':'Undead','dragonkin':'Dragonkin','demon':'Demon','elemental':'Elemental','giant':'Giant','mechanical':'Mechanical','critter':'Critter'}

def valid_url(url):
    try:
        if any(c.isspace() or c in '<>"\'[]()\\' for c in url):return False
        p=urllib.parse.urlsplit(url)
        return p.scheme=='https' and p.hostname in HOSTS and not p.username and not p.password and p.port in (None,443)
    except ValueError:return False

def canonical(url):
    if not valid_url(url):raise ValueError('URL outside source allowlist')
    p=urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit((p.scheme,p.netloc,p.path,p.query,''))

def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()

def plain(value):return re.sub(r'\s+',' ',value).strip()

class VisiblePage(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True);self.skip=[];self.parts=[];self.title=[];self.in_title=False;self.links=[];self.anchor=None;self.term=None;self.definition=None;self.field=None;self.fields={};self.record_header=[];self.in_record_header=False
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag in ('script','style','noscript','svg','nav','footer','form') or tag=='header' and 'record' not in attrs.get('class',''):
            self.skip.append(tag)
        if tag=='title' and not self.skip:self.in_title=True
        if self.skip:return
        if tag=='header' and 'record' in attrs.get('class',''):self.in_record_header=True
        if tag=='dt':self.term=[]
        if tag=='dd':self.definition=[]
        if tag in ('p','div','dt','dd','li','h1','h2','h3','tr','br','section'):self.parts.append('\n')
        if tag=='a' and attrs.get('href'):self.anchor={'href':attrs['href'],'text':[]}
    def handle_endtag(self,tag):
        if tag=='title':self.in_title=False
        if self.skip:
            if tag==self.skip[-1]:self.skip.pop()
            return
        if tag=='header':self.in_record_header=False
        if tag=='dt' and self.term is not None:self.field=plain(' '.join(self.term));self.term=None
        if tag=='dd' and self.definition is not None:
            if self.field:self.fields.setdefault(self.field,plain(' '.join(self.definition)))
            self.definition=None;self.field=None
        if tag=='a' and self.anchor:
            self.links.append({'href':self.anchor['href'],'title':plain(' '.join(self.anchor['text']))[:160]});self.anchor=None
        if tag in ('p','div','dt','dd','li','h1','h2','h3','tr','section'):self.parts.append('\n')
    def handle_data(self,text):
        if self.in_title:self.title.append(text);return
        if not self.skip:
            self.parts.append(text+' ')
            if self.in_record_header:self.record_header.append(text)
            if self.anchor:self.anchor['text'].append(text)
            if self.term is not None:self.term.append(text)
            if self.definition is not None:self.definition.append(text)
    @property
    def text(self):return '\n'.join(plain(line) for line in ''.join(self.parts).splitlines() if plain(line))

def observation(url,body,content_type='text/html'):
    """Extract only explicit facts; numbers in map totals are not population."""
    host=urllib.parse.urlsplit(url).hostname
    if 'xml' in content_type or body.lstrip().startswith('<?xml'):
        root=ET.fromstring(body);items=[]
        for item in root.findall('.//item')[:80]:
            title=plain(item.findtext('title',''));link=item.findtext('link','').strip()
            if re.search(r'forever|classic era',title+' '+link,re.I) and valid_url(link):items.append({'title':title[:160],'url':canonical(link),'date':item.findtext('pubDate','')[:80]})
        facts={'items':items};record={'url':url,'title':'Wowhead RSS: Forever / Classic Era','facts':facts,'links':items,'excerpt':''}
        record['fingerprint']=digest(facts);return record
    page=VisiblePage();page.feed(body);text=page.text
    if len(text)<120 or re.search(r'verify you are human|just a moment|access denied|captcha',text[:1200],re.I):raise ValueError('Challenge or insufficient readable content')
    links=[]
    for link in page.links:
        target=urllib.parse.urljoin(url,link['href'])
        if valid_url(target):links.append({'url':canonical(target),'title':link['title']})
    links=list({x['url']:x for x in links}.values())
    facts={};npc=re.search(r'/npc/(\d+)(?:/|$)|/npc=(\d+)',urllib.parse.urlsplit(url).path)
    if npc:
        facts['npc_id']=int(npc.group(1) or npc.group(2));facts['flavor']='classic' if '/classic/' in url else 'forever'
        level_field=page.fields.get('Level') or page.fields.get('Уровень')
        level_text=level_field or (re.search(r'(?:^|\n)Level\s*:\s*([^\n]+)',text,re.I).group(1) if re.search(r'(?:^|\n)Level\s*:\s*([^\n]+)',text,re.I) else '')
        m=re.fullmatch(r'\s*(\d{1,3})(?:\s*[–−-]\s*(\d{1,3}))?\s*',level_text)
        if m:
            lo=int(m.group(1));hi=int(m.group(2) or lo)
            if 1<=lo<=hi<=255:facts['levels']=[lo,hi]
        type_text=page.fields.get('Type') or page.fields.get('Тип') or ''
        m=re.match(r'('+ '|'.join(TYPES) +r')\b',type_text,re.I)
        if m:facts['creature_type']=TYPES[m.group(1).lower()]
        header_text=plain(' '.join(page.record_header))
        m=re.search(r'\b((?:\d+\.){3}\d+)\b',header_text)
        if m:facts['build']=m.group(1)
        # Some old layouts have no record-header wrapper. Only use explicitly
        # labelled unlisted metadata there, not the build of a random table row.
        if not m:
            m=re.search(r'Unlisted build\s*[·:]?\s*((?:\d+\.){3}\d+)\b',text,re.I)
            if m:facts['build']=m.group(1)
        if 'Unlisted build' in header_text or not header_text and 'Unlisted build' in text:facts['unlisted_build']=True
        m=re.search(r'Seen\s+(\d+)\s+times\s*\((\d+)\s+individuals?\)',text,re.I)
        if m:facts.update(sightings=int(m.group(1)),individuals=int(m.group(2)))
        for label,key in [('First seen','first_seen'),('Last seen','last_seen')]:
            m=re.fullmatch(r'(\d{1,2} [A-Za-z]{3} \d{4})',page.fields.get(label,''),re.I)
            if m:
                try:facts[key]=datetime.strptime(m.group(1),'%d %b %Y').date().isoformat()
                except ValueError:pass
        m=re.search(r'(.{1,100}?)\s+At\s+(\d{1,2}(?:\.\d+)?)\s*,\s*(\d{1,2}(?:\.\d+)?)',page.fields.get('Location',''),re.I)
        if m:
            x,y=map(float,m.group(2,3))
            if 0<=x<=100 and 0<=y<=100:facts.update(zone=m.group(1),coordinates=[x,y])
        if facts.get('sightings'):facts['evidence_kind']='player_observation'
        facts['extraction']='structured_facts' if any(k in facts for k in ('levels','creature_type','coordinates','sightings')) else 'metadata_only'
    build=re.search(r'(?:build|сборка)\s*:?\s*((?:\d+\.){3}\d+)',text,re.I)
    if build:facts.setdefault('page_build',build.group(1))
    if host=='foreverchanges.pro' and urllib.parse.urlsplit(url).path.rstrip('/')=='/ru/map':
        facts['position_origin']='classic_reference' if re.search(r'там же, где в Classic|positions?.{0,60}Classic',text,re.I) else 'unknown'
    # Keep no complete third-party page in state/artifacts: facts, hash and at
    # most 24 quoted words per page. This is also the model's evidence budget.
    paragraphs=[line for line in text.splitlines() if len(line.split())>=8]
    relevant=lambda line:len(re.findall(r'npc|creature|spawn|rare|hotfix|моб|противник|координат|плотност|изменен|обновлен',line,re.I))
    excerpt=max(paragraphs,key=relevant) if paragraphs else text
    record={'url':url,'title':plain(''.join(page.title))[:160],'facts':facts,'links':links[:80],'excerpt':' '.join(excerpt.split()[:24])}
    normalized=re.sub(r'\b\d+\s+(?:views|minutes? ago|hours? ago)\b','',text,flags=re.I)
    record['fingerprint']=hashlib.sha256(normalized.encode()).hexdigest();return record

class SourceUnavailable(Exception):pass

class SourceReader:
    def __init__(self,config):
        self.config=config;self.robots={};self.stopped={};self.last={};self.requests=0;self.downloaded=0
        self.opener=urllib.request.build_opener(self.Redirects(self))
    class Redirects(urllib.request.HTTPRedirectHandler):
        def __init__(self,reader):super().__init__();self.reader=reader
        def redirect_request(self,req,fp,code,msg,headers,newurl):
            if not valid_url(newurl) or urllib.parse.urlsplit(newurl).hostname!=urllib.parse.urlsplit(req.full_url).hostname:raise SourceUnavailable('Cross-host redirect refused')
            robot=self.reader.robots.get(urllib.parse.urlsplit(newurl).hostname)
            if robot and not robot.can_fetch('WoWAtlasAuditor',newurl):raise SourceUnavailable('Redirect disallowed by robots.txt')
            return super().redirect_request(req,fp,code,msg,headers,newurl)
    def raw(self,url):
        if not valid_url(url):raise SourceUnavailable('URL outside allowlist')
        host=urllib.parse.urlsplit(url).hostname
        if self.requests>=self.config['request_budget']:raise SourceUnavailable('Request budget exhausted')
        if host in self.stopped:raise SourceUnavailable(self.stopped[host])
        remaining=self.config.get('max_download_bytes',20000000)-self.downloaded
        if remaining<=0:raise SourceUnavailable('Download byte budget exhausted')
        pause=self.config['per_host_delay_seconds']-(time.monotonic()-self.last.get(host,0))
        if pause>0:time.sleep(pause)
        self.requests+=1;self.last[host]=time.monotonic()
        request=urllib.request.Request(url,headers={'User-Agent':self.config['user_agent'],'Accept':'text/html, application/rss+xml, application/xml, text/plain'})
        try:
            with self.opener.open(request,timeout=self.config['request_timeout_seconds']) as response:
                limit=min(self.config['max_response_bytes'],remaining);body=response.read(limit+1);self.downloaded+=len(body)
                if len(body)>limit:raise SourceUnavailable('Response exceeds configured byte limit')
                return body.decode(response.headers.get_content_charset() or 'utf-8',errors='replace'),response.headers.get_content_type()
        except urllib.error.HTTPError as e:
            if e.code in (401,403,429):self.stopped[host]='Host access limited: HTTP '+str(e.code)
            raise SourceUnavailable('HTTP '+str(e.code)) from None
        except (urllib.error.URLError,TimeoutError,OSError):raise SourceUnavailable('Network unavailable or timed out') from None
    def fetch(self,url):
        url=canonical(url);host=urllib.parse.urlsplit(url).hostname
        if host not in self.robots:
            try:
                text,_=self.raw('https://'+host+'/robots.txt');r=urllib.robotparser.RobotFileParser();r.parse(text.splitlines());self.robots[host]=r
            except SourceUnavailable as e:
                self.stopped[host]='robots.txt unavailable: '+str(e);raise SourceUnavailable(self.stopped[host]) from None
        robot=self.robots[host]
        if not robot.can_fetch('WoWAtlasAuditor',url):raise SourceUnavailable('Disallowed by robots.txt')
        crawl=robot.crawl_delay('WoWAtlasAuditor')
        if crawl and host in self.last:
            pause=crawl-(time.monotonic()-self.last[host])
            if pause>self.config['request_timeout_seconds']:raise SourceUnavailable('Crawl delay exceeds run budget')
            if pause>0:time.sleep(pause)
        body,content_type=self.raw(url)
        if not any(t in content_type for t in ('html','xml','text/plain')):raise SourceUnavailable('Unsupported response type')
        return observation(url,body,content_type)
