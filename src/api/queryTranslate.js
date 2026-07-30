// Base44 sorgu semantiğini PostgREST çağrılarına çeviren saf fonksiyonlar.
// Ayrı dosyada: hem shim kullanıyor hem de birim testleri buradan geçiyor.

/** Base44 sort formatı: "-created_date" (desc) | "name" (asc) | virgülle çoklu */
export function applySort(query, sort) {
  if (!sort) return query;
  for (const part of String(sort).split(',').map(s => s.trim()).filter(Boolean)) {
    const desc = part.startsWith('-');
    query = query.order(desc ? part.slice(1) : part, { ascending: !desc, nullsFirst: false });
  }
  return query;
}

/**
 * Base44 where objesi -> PostgREST.
 * Düz eşitliğin yanında Mongo-tarzı operatörler:
 * $gt $gte $lt $lte $ne $in $nin $exists $like $ilike $contains
 */
export function applyWhere(query, where) {
  if (!where) return query;
  for (const [field, cond] of Object.entries(where)) {
    if (cond === null) { query = query.is(field, null); continue; }

    if (typeof cond === 'object' && !Array.isArray(cond)) {
      for (const [op, val] of Object.entries(cond)) {
        switch (op) {
          case '$gt':  query = query.gt(field, val); break;
          case '$gte': query = query.gte(field, val); break;
          case '$lt':  query = query.lt(field, val); break;
          case '$lte': query = query.lte(field, val); break;
          case '$ne':  query = val === null ? query.not(field, 'is', null) : query.neq(field, val); break;
          case '$in':  query = query.in(field, val); break;
          case '$nin': query = query.not(field, 'in', `(${val.join(',')})`); break;
          case '$exists': query = val ? query.not(field, 'is', null) : query.is(field, null); break;
          case '$like':   query = query.like(field, val); break;
          case '$ilike':  query = query.ilike(field, val); break;
          case '$contains': query = query.contains(field, val); break;
          default: throw new Error(`Desteklenmeyen filtre operatörü: ${op} (alan: ${field})`);
        }
      }
      continue;
    }

    // text[] kolonuna dizi ile filtre => "içeriyor"
    query = Array.isArray(cond) ? query.contains(field, cond) : query.eq(field, cond);
  }
  return query;
}
