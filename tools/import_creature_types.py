"""Read pinned Classic reference types without treating them as Forever observations."""
import gzip
import hashlib
import json

TYPES={'Beast','Dragonkin','Demon','Elemental','Giant','Undead','Humanoid','Critter','Mechanical'}


def read_types(source):
    folder=source/'creature_types'
    raw=gzip.decompress((folder/'classic_npcs.json.gz').read_bytes())
    provenance=json.loads((folder/'provenance.json').read_text())
    if hashlib.sha256(raw).hexdigest()!=provenance['original_sha256']:
        raise ValueError('Creature type snapshot hash mismatch')
    if provenance['game_flavor']!='classic-reference' or provenance['forever_verified'] is not False:
        raise ValueError('Classic reference must not be marked Forever verified')
    result={}
    for row in json.loads(raw)['records']:
        ident=row['id']
        if not isinstance(ident,int) or ident<=0 or ident in result or not isinstance(row['name'],str):
            raise ValueError('Invalid or duplicate creature type ID')
        if row['verificationStatus']!='classic-baseline':
            raise ValueError('Unexpected creature type verification status')
        result[ident]={'type':row['type'] if row['type'] in TYPES else None,
            'status':'classic_reference' if row['type'] in TYPES else 'unknown',
            'source':'classic_reference','source_type':row['type'],
            'family':row.get('family'),'source_name':row['name']}
    return result,provenance


def classification(ident,name,lookup):
    entry=lookup.get(ident)
    if entry is None:
        return {'type':None,'status':'unknown','source':None,'family':None,'name_changed':False}
    return {**entry,'name_changed':entry['source_name'].casefold()!=name.casefold()}
