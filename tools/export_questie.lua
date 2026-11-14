-- Run from a pinned QuestieDB checkout after tools/export-forever.lua --include-authored.
-- Emits JSON containing static tables and ruRU lookups; no game runtime.
local function read(path)
 local f=assert(io.open(path,'rb'));local text=f:read('*a');f:close();return text
end
local function quote(s)
 return '"'..s:gsub('[%z\1-\31\\"]',function(c)
  return string.format('\\u%04x',c:byte())
 end)..'"'
end
local function json(value)
 local t=type(value)
 if t=='nil' then return 'null' end
 if t=='boolean' then return tostring(value) end
 if t=='number' then
  assert(value==value and math.abs(value)~=math.huge,'Non-finite value')
  return string.format('%.17g',value)
 end
 if t=='string' then return quote(value) end
 assert(t=='table','Unsupported Lua value '..t)
 local keys={};for k in pairs(value) do keys[#keys+1]=k end
 table.sort(keys,function(a,b)return tostring(a)<tostring(b)end)
 local parts={};for _,k in ipairs(keys) do parts[#parts+1]=quote(tostring(k))..':'..json(value[k]) end
 return '{'..table.concat(parts,',')..'}'
end
local result={}
for _,spec in ipairs({{'npcs','Npc','Npcs'},{'quests','Quest','Quests'},{'items','Item','Items'},{'objects','Object','Objects'}}) do
 local rows=dofile('src/corrections/Forever/combined/forever'..spec[2]..'DB.lua')
 local lookup={}
 for _,prefix in ipairs({'','traces/'}) do
  local text=read('l10n/Forever/'..prefix..'lookup'..spec[3]..'/ruRU.lua')
  local literal=assert(text:match('%[%[(return .-)%]%]'),'Missing localization literal')
  local parse=assert(loadstring(literal));setfenv(parse,{})
  for id,v in pairs(parse()) do lookup[id]=v end
 end
 result[spec[1]]={rows=rows,ruRU=lookup}
end
local text=read('support/Forever/Zones/uiMapIdToAreaId.lua')
local literal=assert(text:match('ZoneDB.private.uiMapIdToAreaId = %[%[(return .-)%]%]'))
local parse=assert(loadstring(literal));setfenv(parse,{})
result.uiMapToArea=parse()
io.write(json(result),'\n')
