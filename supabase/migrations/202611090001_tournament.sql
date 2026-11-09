create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Frozen Unicode 15.0.0 full casefold; identical to src/domain/unicode-casefold.json.
-- Locale-independent, including sigma, dotted I, and multi-character expansions.
create function private.name_key(value text) returns text language plpgsql immutable strict set search_path='' as $$
declare
 v_map constant jsonb := '{"A":"a","B":"b","C":"c","D":"d","E":"e","F":"f","G":"g","H":"h","I":"i","J":"j","K":"k","L":"l","M":"m","N":"n","O":"o","P":"p","Q":"q","R":"r","S":"s","T":"t","U":"u","V":"v","W":"w","X":"x","Y":"y","Z":"z","µ":"μ","À":"à","Á":"á","Â":"â","Ã":"ã","Ä":"ä","Å":"å","Æ":"æ","Ç":"ç","È":"è","É":"é","Ê":"ê","Ë":"ë","Ì":"ì","Í":"í","Î":"î","Ï":"ï","Ð":"ð","Ñ":"ñ","Ò":"ò","Ó":"ó","Ô":"ô","Õ":"õ","Ö":"ö","Ø":"ø","Ù":"ù","Ú":"ú","Û":"û","Ü":"ü","Ý":"ý","Þ":"þ","ß":"ss","Ā":"ā","Ă":"ă","Ą":"ą","Ć":"ć","Ĉ":"ĉ","Ċ":"ċ","Č":"č","Ď":"ď","Đ":"đ","Ē":"ē","Ĕ":"ĕ","Ė":"ė","Ę":"ę","Ě":"ě","Ĝ":"ĝ","Ğ":"ğ","Ġ":"ġ","Ģ":"ģ","Ĥ":"ĥ","Ħ":"ħ","Ĩ":"ĩ","Ī":"ī","Ĭ":"ĭ","Į":"į","İ":"i̇","Ĳ":"ĳ","Ĵ":"ĵ","Ķ":"ķ","Ĺ":"ĺ","Ļ":"ļ","Ľ":"ľ","Ŀ":"ŀ","Ł":"ł","Ń":"ń","Ņ":"ņ","Ň":"ň","ŉ":"ʼn","Ŋ":"ŋ","Ō":"ō","Ŏ":"ŏ","Ő":"ő","Œ":"œ","Ŕ":"ŕ","Ŗ":"ŗ","Ř":"ř","Ś":"ś","Ŝ":"ŝ","Ş":"ş","Š":"š","Ţ":"ţ","Ť":"ť","Ŧ":"ŧ","Ũ":"ũ","Ū":"ū","Ŭ":"ŭ","Ů":"ů","Ű":"ű","Ų":"ų","Ŵ":"ŵ","Ŷ":"ŷ","Ÿ":"ÿ","Ź":"ź","Ż":"ż","Ž":"ž","ſ":"s","Ɓ":"ɓ","Ƃ":"ƃ","Ƅ":"ƅ","Ɔ":"ɔ","Ƈ":"ƈ","Ɖ":"ɖ","Ɗ":"ɗ","Ƌ":"ƌ","Ǝ":"ǝ","Ə":"ə","Ɛ":"ɛ","Ƒ":"ƒ","Ɠ":"ɠ","Ɣ":"ɣ","Ɩ":"ɩ","Ɨ":"ɨ","Ƙ":"ƙ","Ɯ":"ɯ","Ɲ":"ɲ","Ɵ":"ɵ","Ơ":"ơ","Ƣ":"ƣ","Ƥ":"ƥ","Ʀ":"ʀ","Ƨ":"ƨ","Ʃ":"ʃ","Ƭ":"ƭ","Ʈ":"ʈ","Ư":"ư","Ʊ":"ʊ","Ʋ":"ʋ","Ƴ":"ƴ","Ƶ":"ƶ","Ʒ":"ʒ","Ƹ":"ƹ","Ƽ":"ƽ","Ǆ":"ǆ","ǅ":"ǆ","Ǉ":"ǉ","ǈ":"ǉ","Ǌ":"ǌ","ǋ":"ǌ","Ǎ":"ǎ","Ǐ":"ǐ","Ǒ":"ǒ","Ǔ":"ǔ","Ǖ":"ǖ","Ǘ":"ǘ","Ǚ":"ǚ","Ǜ":"ǜ","Ǟ":"ǟ","Ǡ":"ǡ","Ǣ":"ǣ","Ǥ":"ǥ","Ǧ":"ǧ","Ǩ":"ǩ","Ǫ":"ǫ","Ǭ":"ǭ","Ǯ":"ǯ","ǰ":"ǰ","Ǳ":"ǳ","ǲ":"ǳ","Ǵ":"ǵ","Ƕ":"ƕ","Ƿ":"ƿ","Ǹ":"ǹ","Ǻ":"ǻ","Ǽ":"ǽ","Ǿ":"ǿ","Ȁ":"ȁ","Ȃ":"ȃ","Ȅ":"ȅ","Ȇ":"ȇ","Ȉ":"ȉ","Ȋ":"ȋ","Ȍ":"ȍ","Ȏ":"ȏ","Ȑ":"ȑ","Ȓ":"ȓ","Ȕ":"ȕ","Ȗ":"ȗ","Ș":"ș","Ț":"ț","Ȝ":"ȝ","Ȟ":"ȟ","Ƞ":"ƞ","Ȣ":"ȣ","Ȥ":"ȥ","Ȧ":"ȧ","Ȩ":"ȩ","Ȫ":"ȫ","Ȭ":"ȭ","Ȯ":"ȯ","Ȱ":"ȱ","Ȳ":"ȳ","Ⱥ":"ⱥ","Ȼ":"ȼ","Ƚ":"ƚ","Ⱦ":"ⱦ","Ɂ":"ɂ","Ƀ":"ƀ","Ʉ":"ʉ","Ʌ":"ʌ","Ɇ":"ɇ","Ɉ":"ɉ","Ɋ":"ɋ","Ɍ":"ɍ","Ɏ":"ɏ","ͅ":"ι","Ͱ":"ͱ","Ͳ":"ͳ","Ͷ":"ͷ","Ϳ":"ϳ","Ά":"ά","Έ":"έ","Ή":"ή","Ί":"ί","Ό":"ό","Ύ":"ύ","Ώ":"ώ","ΐ":"ΐ","Α":"α","Β":"β","Γ":"γ","Δ":"δ","Ε":"ε","Ζ":"ζ","Η":"η","Θ":"θ","Ι":"ι","Κ":"κ","Λ":"λ","Μ":"μ","Ν":"ν","Ξ":"ξ","Ο":"ο","Π":"π","Ρ":"ρ","Σ":"σ","Τ":"τ","Υ":"υ","Φ":"φ","Χ":"χ","Ψ":"ψ","Ω":"ω","Ϊ":"ϊ","Ϋ":"ϋ","ΰ":"ΰ","ς":"σ","Ϗ":"ϗ","ϐ":"β","ϑ":"θ","ϕ":"φ","ϖ":"π","Ϙ":"ϙ","Ϛ":"ϛ","Ϝ":"ϝ","Ϟ":"ϟ","Ϡ":"ϡ","Ϣ":"ϣ","Ϥ":"ϥ","Ϧ":"ϧ","Ϩ":"ϩ","Ϫ":"ϫ","Ϭ":"ϭ","Ϯ":"ϯ","ϰ":"κ","ϱ":"ρ","ϴ":"θ","ϵ":"ε","Ϸ":"ϸ","Ϲ":"ϲ","Ϻ":"ϻ","Ͻ":"ͻ","Ͼ":"ͼ","Ͽ":"ͽ","Ѐ":"ѐ","Ё":"ё","Ђ":"ђ","Ѓ":"ѓ","Є":"є","Ѕ":"ѕ","І":"і","Ї":"ї","Ј":"ј","Љ":"љ","Њ":"њ","Ћ":"ћ","Ќ":"ќ","Ѝ":"ѝ","Ў":"ў","Џ":"џ","А":"а","Б":"б","В":"в","Г":"г","Д":"д","Е":"е","Ж":"ж","З":"з","И":"и","Й":"й","К":"к","Л":"л","М":"м","Н":"н","О":"о","П":"п","Р":"р","С":"с","Т":"т","У":"у","Ф":"ф","Х":"х","Ц":"ц","Ч":"ч","Ш":"ш","Щ":"щ","Ъ":"ъ","Ы":"ы","Ь":"ь","Э":"э","Ю":"ю","Я":"я","Ѡ":"ѡ","Ѣ":"ѣ","Ѥ":"ѥ","Ѧ":"ѧ","Ѩ":"ѩ","Ѫ":"ѫ","Ѭ":"ѭ","Ѯ":"ѯ","Ѱ":"ѱ","Ѳ":"ѳ","Ѵ":"ѵ","Ѷ":"ѷ","Ѹ":"ѹ","Ѻ":"ѻ","Ѽ":"ѽ","Ѿ":"ѿ","Ҁ":"ҁ","Ҋ":"ҋ","Ҍ":"ҍ","Ҏ":"ҏ","Ґ":"ґ","Ғ":"ғ","Ҕ":"ҕ","Җ":"җ","Ҙ":"ҙ","Қ":"қ","Ҝ":"ҝ","Ҟ":"ҟ","Ҡ":"ҡ","Ң":"ң","Ҥ":"ҥ","Ҧ":"ҧ","Ҩ":"ҩ","Ҫ":"ҫ","Ҭ":"ҭ","Ү":"ү","Ұ":"ұ","Ҳ":"ҳ","Ҵ":"ҵ","Ҷ":"ҷ","Ҹ":"ҹ","Һ":"һ","Ҽ":"ҽ","Ҿ":"ҿ","Ӏ":"ӏ","Ӂ":"ӂ","Ӄ":"ӄ","Ӆ":"ӆ","Ӈ":"ӈ","Ӊ":"ӊ","Ӌ":"ӌ","Ӎ":"ӎ","Ӑ":"ӑ","Ӓ":"ӓ","Ӕ":"ӕ","Ӗ":"ӗ","Ә":"ә","Ӛ":"ӛ","Ӝ":"ӝ","Ӟ":"ӟ","Ӡ":"ӡ","Ӣ":"ӣ","Ӥ":"ӥ","Ӧ":"ӧ","Ө":"ө","Ӫ":"ӫ","Ӭ":"ӭ","Ӯ":"ӯ","Ӱ":"ӱ","Ӳ":"ӳ","Ӵ":"ӵ","Ӷ":"ӷ","Ӹ":"ӹ","Ӻ":"ӻ","Ӽ":"ӽ","Ӿ":"ӿ","Ԁ":"ԁ","Ԃ":"ԃ","Ԅ":"ԅ","Ԇ":"ԇ","Ԉ":"ԉ","Ԋ":"ԋ","Ԍ":"ԍ","Ԏ":"ԏ","Ԑ":"ԑ","Ԓ":"ԓ","Ԕ":"ԕ","Ԗ":"ԗ","Ԙ":"ԙ","Ԛ":"ԛ","Ԝ":"ԝ","Ԟ":"ԟ","Ԡ":"ԡ","Ԣ":"ԣ","Ԥ":"ԥ","Ԧ":"ԧ","Ԩ":"ԩ","Ԫ":"ԫ","Ԭ":"ԭ","Ԯ":"ԯ","Ա":"ա","Բ":"բ","Գ":"գ","Դ":"դ","Ե":"ե","Զ":"զ","Է":"է","Ը":"ը","Թ":"թ","Ժ":"ժ","Ի":"ի","Լ":"լ","Խ":"խ","Ծ":"ծ","Կ":"կ","Հ":"հ","Ձ":"ձ","Ղ":"ղ","Ճ":"ճ","Մ":"մ","Յ":"յ","Ն":"ն","Շ":"շ","Ո":"ո","Չ":"չ","Պ":"պ","Ջ":"ջ","Ռ":"ռ","Ս":"ս","Վ":"վ","Տ":"տ","Ր":"ր","Ց":"ց","Ւ":"ւ","Փ":"փ","Ք":"ք","Օ":"օ","Ֆ":"ֆ","և":"եւ","Ⴀ":"ⴀ","Ⴁ":"ⴁ","Ⴂ":"ⴂ","Ⴃ":"ⴃ","Ⴄ":"ⴄ","Ⴅ":"ⴅ","Ⴆ":"ⴆ","Ⴇ":"ⴇ","Ⴈ":"ⴈ","Ⴉ":"ⴉ","Ⴊ":"ⴊ","Ⴋ":"ⴋ","Ⴌ":"ⴌ","Ⴍ":"ⴍ","Ⴎ":"ⴎ","Ⴏ":"ⴏ","Ⴐ":"ⴐ","Ⴑ":"ⴑ","Ⴒ":"ⴒ","Ⴓ":"ⴓ","Ⴔ":"ⴔ","Ⴕ":"ⴕ","Ⴖ":"ⴖ","Ⴗ":"ⴗ","Ⴘ":"ⴘ","Ⴙ":"ⴙ","Ⴚ":"ⴚ","Ⴛ":"ⴛ","Ⴜ":"ⴜ","Ⴝ":"ⴝ","Ⴞ":"ⴞ","Ⴟ":"ⴟ","Ⴠ":"ⴠ","Ⴡ":"ⴡ","Ⴢ":"ⴢ","Ⴣ":"ⴣ","Ⴤ":"ⴤ","Ⴥ":"ⴥ","Ⴧ":"ⴧ","Ⴭ":"ⴭ","ᏸ":"Ᏸ","ᏹ":"Ᏹ","ᏺ":"Ᏺ","ᏻ":"Ᏻ","ᏼ":"Ᏼ","ᏽ":"Ᏽ","ᲀ":"в","ᲁ":"д","ᲂ":"о","ᲃ":"с","ᲄ":"т","ᲅ":"т","ᲆ":"ъ","ᲇ":"ѣ","ᲈ":"ꙋ","Ა":"ა","Ბ":"ბ","Გ":"გ","Დ":"დ","Ე":"ე","Ვ":"ვ","Ზ":"ზ","Თ":"თ","Ი":"ი","Კ":"კ","Ლ":"ლ","Მ":"მ","Ნ":"ნ","Ო":"ო","Პ":"პ","Ჟ":"ჟ","Რ":"რ","Ს":"ს","Ტ":"ტ","Უ":"უ","Ფ":"ფ","Ქ":"ქ","Ღ":"ღ","Ყ":"ყ","Შ":"შ","Ჩ":"ჩ","Ც":"ც","Ძ":"ძ","Წ":"წ","Ჭ":"ჭ","Ხ":"ხ","Ჯ":"ჯ","Ჰ":"ჰ","Ჱ":"ჱ","Ჲ":"ჲ","Ჳ":"ჳ","Ჴ":"ჴ","Ჵ":"ჵ","Ჶ":"ჶ","Ჷ":"ჷ","Ჸ":"ჸ","Ჹ":"ჹ","Ჺ":"ჺ","Ჽ":"ჽ","Ჾ":"ჾ","Ჿ":"ჿ","Ḁ":"ḁ","Ḃ":"ḃ","Ḅ":"ḅ","Ḇ":"ḇ","Ḉ":"ḉ","Ḋ":"ḋ","Ḍ":"ḍ","Ḏ":"ḏ","Ḑ":"ḑ","Ḓ":"ḓ","Ḕ":"ḕ","Ḗ":"ḗ","Ḙ":"ḙ","Ḛ":"ḛ","Ḝ":"ḝ","Ḟ":"ḟ","Ḡ":"ḡ","Ḣ":"ḣ","Ḥ":"ḥ","Ḧ":"ḧ","Ḩ":"ḩ","Ḫ":"ḫ","Ḭ":"ḭ","Ḯ":"ḯ","Ḱ":"ḱ","Ḳ":"ḳ","Ḵ":"ḵ","Ḷ":"ḷ","Ḹ":"ḹ","Ḻ":"ḻ","Ḽ":"ḽ","Ḿ":"ḿ","Ṁ":"ṁ","Ṃ":"ṃ","Ṅ":"ṅ","Ṇ":"ṇ","Ṉ":"ṉ","Ṋ":"ṋ","Ṍ":"ṍ","Ṏ":"ṏ","Ṑ":"ṑ","Ṓ":"ṓ","Ṕ":"ṕ","Ṗ":"ṗ","Ṙ":"ṙ","Ṛ":"ṛ","Ṝ":"ṝ","Ṟ":"ṟ","Ṡ":"ṡ","Ṣ":"ṣ","Ṥ":"ṥ","Ṧ":"ṧ","Ṩ":"ṩ","Ṫ":"ṫ","Ṭ":"ṭ","Ṯ":"ṯ","Ṱ":"ṱ","Ṳ":"ṳ","Ṵ":"ṵ","Ṷ":"ṷ","Ṹ":"ṹ","Ṻ":"ṻ","Ṽ":"ṽ","Ṿ":"ṿ","Ẁ":"ẁ","Ẃ":"ẃ","Ẅ":"ẅ","Ẇ":"ẇ","Ẉ":"ẉ","Ẋ":"ẋ","Ẍ":"ẍ","Ẏ":"ẏ","Ẑ":"ẑ","Ẓ":"ẓ","Ẕ":"ẕ","ẖ":"ẖ","ẗ":"ẗ","ẘ":"ẘ","ẙ":"ẙ","ẚ":"aʾ","ẛ":"ṡ","ẞ":"ss","Ạ":"ạ","Ả":"ả","Ấ":"ấ","Ầ":"ầ","Ẩ":"ẩ","Ẫ":"ẫ","Ậ":"ậ","Ắ":"ắ","Ằ":"ằ","Ẳ":"ẳ","Ẵ":"ẵ","Ặ":"ặ","Ẹ":"ẹ","Ẻ":"ẻ","Ẽ":"ẽ","Ế":"ế","Ề":"ề","Ể":"ể","Ễ":"ễ","Ệ":"ệ","Ỉ":"ỉ","Ị":"ị","Ọ":"ọ","Ỏ":"ỏ","Ố":"ố","Ồ":"ồ","Ổ":"ổ","Ỗ":"ỗ","Ộ":"ộ","Ớ":"ớ","Ờ":"ờ","Ở":"ở","Ỡ":"ỡ","Ợ":"ợ","Ụ":"ụ","Ủ":"ủ","Ứ":"ứ","Ừ":"ừ","Ử":"ử","Ữ":"ữ","Ự":"ự","Ỳ":"ỳ","Ỵ":"ỵ","Ỷ":"ỷ","Ỹ":"ỹ","Ỻ":"ỻ","Ỽ":"ỽ","Ỿ":"ỿ","Ἀ":"ἀ","Ἁ":"ἁ","Ἂ":"ἂ","Ἃ":"ἃ","Ἄ":"ἄ","Ἅ":"ἅ","Ἆ":"ἆ","Ἇ":"ἇ","Ἐ":"ἐ","Ἑ":"ἑ","Ἒ":"ἒ","Ἓ":"ἓ","Ἔ":"ἔ","Ἕ":"ἕ","Ἠ":"ἠ","Ἡ":"ἡ","Ἢ":"ἢ","Ἣ":"ἣ","Ἤ":"ἤ","Ἥ":"ἥ","Ἦ":"ἦ","Ἧ":"ἧ","Ἰ":"ἰ","Ἱ":"ἱ","Ἲ":"ἲ","Ἳ":"ἳ","Ἴ":"ἴ","Ἵ":"ἵ","Ἶ":"ἶ","Ἷ":"ἷ","Ὀ":"ὀ","Ὁ":"ὁ","Ὂ":"ὂ","Ὃ":"ὃ","Ὄ":"ὄ","Ὅ":"ὅ","ὐ":"ὐ","ὒ":"ὒ","ὔ":"ὔ","ὖ":"ὖ","Ὑ":"ὑ","Ὓ":"ὓ","Ὕ":"ὕ","Ὗ":"ὗ","Ὠ":"ὠ","Ὡ":"ὡ","Ὢ":"ὢ","Ὣ":"ὣ","Ὤ":"ὤ","Ὥ":"ὥ","Ὦ":"ὦ","Ὧ":"ὧ","ᾀ":"ἀι","ᾁ":"ἁι","ᾂ":"ἂι","ᾃ":"ἃι","ᾄ":"ἄι","ᾅ":"ἅι","ᾆ":"ἆι","ᾇ":"ἇι","ᾈ":"ἀι","ᾉ":"ἁι","ᾊ":"ἂι","ᾋ":"ἃι","ᾌ":"ἄι","ᾍ":"ἅι","ᾎ":"ἆι","ᾏ":"ἇι","ᾐ":"ἠι","ᾑ":"ἡι","ᾒ":"ἢι","ᾓ":"ἣι","ᾔ":"ἤι","ᾕ":"ἥι","ᾖ":"ἦι","ᾗ":"ἧι","ᾘ":"ἠι","ᾙ":"ἡι","ᾚ":"ἢι","ᾛ":"ἣι","ᾜ":"ἤι","ᾝ":"ἥι","ᾞ":"ἦι","ᾟ":"ἧι","ᾠ":"ὠι","ᾡ":"ὡι","ᾢ":"ὢι","ᾣ":"ὣι","ᾤ":"ὤι","ᾥ":"ὥι","ᾦ":"ὦι","ᾧ":"ὧι","ᾨ":"ὠι","ᾩ":"ὡι","ᾪ":"ὢι","ᾫ":"ὣι","ᾬ":"ὤι","ᾭ":"ὥι","ᾮ":"ὦι","ᾯ":"ὧι","ᾲ":"ὰι","ᾳ":"αι","ᾴ":"άι","ᾶ":"ᾶ","ᾷ":"ᾶι","Ᾰ":"ᾰ","Ᾱ":"ᾱ","Ὰ":"ὰ","Ά":"ά","ᾼ":"αι","ι":"ι","ῂ":"ὴι","ῃ":"ηι","ῄ":"ήι","ῆ":"ῆ","ῇ":"ῆι","Ὲ":"ὲ","Έ":"έ","Ὴ":"ὴ","Ή":"ή","ῌ":"ηι","ῒ":"ῒ","ΐ":"ΐ","ῖ":"ῖ","ῗ":"ῗ","Ῐ":"ῐ","Ῑ":"ῑ","Ὶ":"ὶ","Ί":"ί","ῢ":"ῢ","ΰ":"ΰ","ῤ":"ῤ","ῦ":"ῦ","ῧ":"ῧ","Ῠ":"ῠ","Ῡ":"ῡ","Ὺ":"ὺ","Ύ":"ύ","Ῥ":"ῥ","ῲ":"ὼι","ῳ":"ωι","ῴ":"ώι","ῶ":"ῶ","ῷ":"ῶι","Ὸ":"ὸ","Ό":"ό","Ὼ":"ὼ","Ώ":"ώ","ῼ":"ωι","Ω":"ω","K":"k","Å":"å","Ⅎ":"ⅎ","Ⅰ":"ⅰ","Ⅱ":"ⅱ","Ⅲ":"ⅲ","Ⅳ":"ⅳ","Ⅴ":"ⅴ","Ⅵ":"ⅵ","Ⅶ":"ⅶ","Ⅷ":"ⅷ","Ⅸ":"ⅸ","Ⅹ":"ⅹ","Ⅺ":"ⅺ","Ⅻ":"ⅻ","Ⅼ":"ⅼ","Ⅽ":"ⅽ","Ⅾ":"ⅾ","Ⅿ":"ⅿ","Ↄ":"ↄ","Ⓐ":"ⓐ","Ⓑ":"ⓑ","Ⓒ":"ⓒ","Ⓓ":"ⓓ","Ⓔ":"ⓔ","Ⓕ":"ⓕ","Ⓖ":"ⓖ","Ⓗ":"ⓗ","Ⓘ":"ⓘ","Ⓙ":"ⓙ","Ⓚ":"ⓚ","Ⓛ":"ⓛ","Ⓜ":"ⓜ","Ⓝ":"ⓝ","Ⓞ":"ⓞ","Ⓟ":"ⓟ","Ⓠ":"ⓠ","Ⓡ":"ⓡ","Ⓢ":"ⓢ","Ⓣ":"ⓣ","Ⓤ":"ⓤ","Ⓥ":"ⓥ","Ⓦ":"ⓦ","Ⓧ":"ⓧ","Ⓨ":"ⓨ","Ⓩ":"ⓩ","Ⰰ":"ⰰ","Ⰱ":"ⰱ","Ⰲ":"ⰲ","Ⰳ":"ⰳ","Ⰴ":"ⰴ","Ⰵ":"ⰵ","Ⰶ":"ⰶ","Ⰷ":"ⰷ","Ⰸ":"ⰸ","Ⰹ":"ⰹ","Ⰺ":"ⰺ","Ⰻ":"ⰻ","Ⰼ":"ⰼ","Ⰽ":"ⰽ","Ⰾ":"ⰾ","Ⰿ":"ⰿ","Ⱀ":"ⱀ","Ⱁ":"ⱁ","Ⱂ":"ⱂ","Ⱃ":"ⱃ","Ⱄ":"ⱄ","Ⱅ":"ⱅ","Ⱆ":"ⱆ","Ⱇ":"ⱇ","Ⱈ":"ⱈ","Ⱉ":"ⱉ","Ⱊ":"ⱊ","Ⱋ":"ⱋ","Ⱌ":"ⱌ","Ⱍ":"ⱍ","Ⱎ":"ⱎ","Ⱏ":"ⱏ","Ⱐ":"ⱐ","Ⱑ":"ⱑ","Ⱒ":"ⱒ","Ⱓ":"ⱓ","Ⱔ":"ⱔ","Ⱕ":"ⱕ","Ⱖ":"ⱖ","Ⱗ":"ⱗ","Ⱘ":"ⱘ","Ⱙ":"ⱙ","Ⱚ":"ⱚ","Ⱛ":"ⱛ","Ⱜ":"ⱜ","Ⱝ":"ⱝ","Ⱞ":"ⱞ","Ⱟ":"ⱟ","Ⱡ":"ⱡ","Ɫ":"ɫ","Ᵽ":"ᵽ","Ɽ":"ɽ","Ⱨ":"ⱨ","Ⱪ":"ⱪ","Ⱬ":"ⱬ","Ɑ":"ɑ","Ɱ":"ɱ","Ɐ":"ɐ","Ɒ":"ɒ","Ⱳ":"ⱳ","Ⱶ":"ⱶ","Ȿ":"ȿ","Ɀ":"ɀ","Ⲁ":"ⲁ","Ⲃ":"ⲃ","Ⲅ":"ⲅ","Ⲇ":"ⲇ","Ⲉ":"ⲉ","Ⲋ":"ⲋ","Ⲍ":"ⲍ","Ⲏ":"ⲏ","Ⲑ":"ⲑ","Ⲓ":"ⲓ","Ⲕ":"ⲕ","Ⲗ":"ⲗ","Ⲙ":"ⲙ","Ⲛ":"ⲛ","Ⲝ":"ⲝ","Ⲟ":"ⲟ","Ⲡ":"ⲡ","Ⲣ":"ⲣ","Ⲥ":"ⲥ","Ⲧ":"ⲧ","Ⲩ":"ⲩ","Ⲫ":"ⲫ","Ⲭ":"ⲭ","Ⲯ":"ⲯ","Ⲱ":"ⲱ","Ⲳ":"ⲳ","Ⲵ":"ⲵ","Ⲷ":"ⲷ","Ⲹ":"ⲹ","Ⲻ":"ⲻ","Ⲽ":"ⲽ","Ⲿ":"ⲿ","Ⳁ":"ⳁ","Ⳃ":"ⳃ","Ⳅ":"ⳅ","Ⳇ":"ⳇ","Ⳉ":"ⳉ","Ⳋ":"ⳋ","Ⳍ":"ⳍ","Ⳏ":"ⳏ","Ⳑ":"ⳑ","Ⳓ":"ⳓ","Ⳕ":"ⳕ","Ⳗ":"ⳗ","Ⳙ":"ⳙ","Ⳛ":"ⳛ","Ⳝ":"ⳝ","Ⳟ":"ⳟ","Ⳡ":"ⳡ","Ⳣ":"ⳣ","Ⳬ":"ⳬ","Ⳮ":"ⳮ","Ⳳ":"ⳳ","Ꙁ":"ꙁ","Ꙃ":"ꙃ","Ꙅ":"ꙅ","Ꙇ":"ꙇ","Ꙉ":"ꙉ","Ꙋ":"ꙋ","Ꙍ":"ꙍ","Ꙏ":"ꙏ","Ꙑ":"ꙑ","Ꙓ":"ꙓ","Ꙕ":"ꙕ","Ꙗ":"ꙗ","Ꙙ":"ꙙ","Ꙛ":"ꙛ","Ꙝ":"ꙝ","Ꙟ":"ꙟ","Ꙡ":"ꙡ","Ꙣ":"ꙣ","Ꙥ":"ꙥ","Ꙧ":"ꙧ","Ꙩ":"ꙩ","Ꙫ":"ꙫ","Ꙭ":"ꙭ","Ꚁ":"ꚁ","Ꚃ":"ꚃ","Ꚅ":"ꚅ","Ꚇ":"ꚇ","Ꚉ":"ꚉ","Ꚋ":"ꚋ","Ꚍ":"ꚍ","Ꚏ":"ꚏ","Ꚑ":"ꚑ","Ꚓ":"ꚓ","Ꚕ":"ꚕ","Ꚗ":"ꚗ","Ꚙ":"ꚙ","Ꚛ":"ꚛ","Ꜣ":"ꜣ","Ꜥ":"ꜥ","Ꜧ":"ꜧ","Ꜩ":"ꜩ","Ꜫ":"ꜫ","Ꜭ":"ꜭ","Ꜯ":"ꜯ","Ꜳ":"ꜳ","Ꜵ":"ꜵ","Ꜷ":"ꜷ","Ꜹ":"ꜹ","Ꜻ":"ꜻ","Ꜽ":"ꜽ","Ꜿ":"ꜿ","Ꝁ":"ꝁ","Ꝃ":"ꝃ","Ꝅ":"ꝅ","Ꝇ":"ꝇ","Ꝉ":"ꝉ","Ꝋ":"ꝋ","Ꝍ":"ꝍ","Ꝏ":"ꝏ","Ꝑ":"ꝑ","Ꝓ":"ꝓ","Ꝕ":"ꝕ","Ꝗ":"ꝗ","Ꝙ":"ꝙ","Ꝛ":"ꝛ","Ꝝ":"ꝝ","Ꝟ":"ꝟ","Ꝡ":"ꝡ","Ꝣ":"ꝣ","Ꝥ":"ꝥ","Ꝧ":"ꝧ","Ꝩ":"ꝩ","Ꝫ":"ꝫ","Ꝭ":"ꝭ","Ꝯ":"ꝯ","Ꝺ":"ꝺ","Ꝼ":"ꝼ","Ᵹ":"ᵹ","Ꝿ":"ꝿ","Ꞁ":"ꞁ","Ꞃ":"ꞃ","Ꞅ":"ꞅ","Ꞇ":"ꞇ","Ꞌ":"ꞌ","Ɥ":"ɥ","Ꞑ":"ꞑ","Ꞓ":"ꞓ","Ꞗ":"ꞗ","Ꞙ":"ꞙ","Ꞛ":"ꞛ","Ꞝ":"ꞝ","Ꞟ":"ꞟ","Ꞡ":"ꞡ","Ꞣ":"ꞣ","Ꞥ":"ꞥ","Ꞧ":"ꞧ","Ꞩ":"ꞩ","Ɦ":"ɦ","Ɜ":"ɜ","Ɡ":"ɡ","Ɬ":"ɬ","Ɪ":"ɪ","Ʞ":"ʞ","Ʇ":"ʇ","Ʝ":"ʝ","Ꭓ":"ꭓ","Ꞵ":"ꞵ","Ꞷ":"ꞷ","Ꞹ":"ꞹ","Ꞻ":"ꞻ","Ꞽ":"ꞽ","Ꞿ":"ꞿ","Ꟁ":"ꟁ","Ꟃ":"ꟃ","Ꞔ":"ꞔ","Ʂ":"ʂ","Ᶎ":"ᶎ","Ꟈ":"ꟈ","Ꟊ":"ꟊ","Ꟑ":"ꟑ","Ꟗ":"ꟗ","Ꟙ":"ꟙ","Ꟶ":"ꟶ","ꭰ":"Ꭰ","ꭱ":"Ꭱ","ꭲ":"Ꭲ","ꭳ":"Ꭳ","ꭴ":"Ꭴ","ꭵ":"Ꭵ","ꭶ":"Ꭶ","ꭷ":"Ꭷ","ꭸ":"Ꭸ","ꭹ":"Ꭹ","ꭺ":"Ꭺ","ꭻ":"Ꭻ","ꭼ":"Ꭼ","ꭽ":"Ꭽ","ꭾ":"Ꭾ","ꭿ":"Ꭿ","ꮀ":"Ꮀ","ꮁ":"Ꮁ","ꮂ":"Ꮂ","ꮃ":"Ꮃ","ꮄ":"Ꮄ","ꮅ":"Ꮅ","ꮆ":"Ꮆ","ꮇ":"Ꮇ","ꮈ":"Ꮈ","ꮉ":"Ꮉ","ꮊ":"Ꮊ","ꮋ":"Ꮋ","ꮌ":"Ꮌ","ꮍ":"Ꮍ","ꮎ":"Ꮎ","ꮏ":"Ꮏ","ꮐ":"Ꮐ","ꮑ":"Ꮑ","ꮒ":"Ꮒ","ꮓ":"Ꮓ","ꮔ":"Ꮔ","ꮕ":"Ꮕ","ꮖ":"Ꮖ","ꮗ":"Ꮗ","ꮘ":"Ꮘ","ꮙ":"Ꮙ","ꮚ":"Ꮚ","ꮛ":"Ꮛ","ꮜ":"Ꮜ","ꮝ":"Ꮝ","ꮞ":"Ꮞ","ꮟ":"Ꮟ","ꮠ":"Ꮠ","ꮡ":"Ꮡ","ꮢ":"Ꮢ","ꮣ":"Ꮣ","ꮤ":"Ꮤ","ꮥ":"Ꮥ","ꮦ":"Ꮦ","ꮧ":"Ꮧ","ꮨ":"Ꮨ","ꮩ":"Ꮩ","ꮪ":"Ꮪ","ꮫ":"Ꮫ","ꮬ":"Ꮬ","ꮭ":"Ꮭ","ꮮ":"Ꮮ","ꮯ":"Ꮯ","ꮰ":"Ꮰ","ꮱ":"Ꮱ","ꮲ":"Ꮲ","ꮳ":"Ꮳ","ꮴ":"Ꮴ","ꮵ":"Ꮵ","ꮶ":"Ꮶ","ꮷ":"Ꮷ","ꮸ":"Ꮸ","ꮹ":"Ꮹ","ꮺ":"Ꮺ","ꮻ":"Ꮻ","ꮼ":"Ꮼ","ꮽ":"Ꮽ","ꮾ":"Ꮾ","ꮿ":"Ꮿ","ﬀ":"ff","ﬁ":"fi","ﬂ":"fl","ﬃ":"ffi","ﬄ":"ffl","ﬅ":"st","ﬆ":"st","ﬓ":"մն","ﬔ":"մե","ﬕ":"մի","ﬖ":"վն","ﬗ":"մխ","Ａ":"ａ","Ｂ":"ｂ","Ｃ":"ｃ","Ｄ":"ｄ","Ｅ":"ｅ","Ｆ":"ｆ","Ｇ":"ｇ","Ｈ":"ｈ","Ｉ":"ｉ","Ｊ":"ｊ","Ｋ":"ｋ","Ｌ":"ｌ","Ｍ":"ｍ","Ｎ":"ｎ","Ｏ":"ｏ","Ｐ":"ｐ","Ｑ":"ｑ","Ｒ":"ｒ","Ｓ":"ｓ","Ｔ":"ｔ","Ｕ":"ｕ","Ｖ":"ｖ","Ｗ":"ｗ","Ｘ":"ｘ","Ｙ":"ｙ","Ｚ":"ｚ","𐐀":"𐐨","𐐁":"𐐩","𐐂":"𐐪","𐐃":"𐐫","𐐄":"𐐬","𐐅":"𐐭","𐐆":"𐐮","𐐇":"𐐯","𐐈":"𐐰","𐐉":"𐐱","𐐊":"𐐲","𐐋":"𐐳","𐐌":"𐐴","𐐍":"𐐵","𐐎":"𐐶","𐐏":"𐐷","𐐐":"𐐸","𐐑":"𐐹","𐐒":"𐐺","𐐓":"𐐻","𐐔":"𐐼","𐐕":"𐐽","𐐖":"𐐾","𐐗":"𐐿","𐐘":"𐑀","𐐙":"𐑁","𐐚":"𐑂","𐐛":"𐑃","𐐜":"𐑄","𐐝":"𐑅","𐐞":"𐑆","𐐟":"𐑇","𐐠":"𐑈","𐐡":"𐑉","𐐢":"𐑊","𐐣":"𐑋","𐐤":"𐑌","𐐥":"𐑍","𐐦":"𐑎","𐐧":"𐑏","𐒰":"𐓘","𐒱":"𐓙","𐒲":"𐓚","𐒳":"𐓛","𐒴":"𐓜","𐒵":"𐓝","𐒶":"𐓞","𐒷":"𐓟","𐒸":"𐓠","𐒹":"𐓡","𐒺":"𐓢","𐒻":"𐓣","𐒼":"𐓤","𐒽":"𐓥","𐒾":"𐓦","𐒿":"𐓧","𐓀":"𐓨","𐓁":"𐓩","𐓂":"𐓪","𐓃":"𐓫","𐓄":"𐓬","𐓅":"𐓭","𐓆":"𐓮","𐓇":"𐓯","𐓈":"𐓰","𐓉":"𐓱","𐓊":"𐓲","𐓋":"𐓳","𐓌":"𐓴","𐓍":"𐓵","𐓎":"𐓶","𐓏":"𐓷","𐓐":"𐓸","𐓑":"𐓹","𐓒":"𐓺","𐓓":"𐓻","𐕰":"𐖗","𐕱":"𐖘","𐕲":"𐖙","𐕳":"𐖚","𐕴":"𐖛","𐕵":"𐖜","𐕶":"𐖝","𐕷":"𐖞","𐕸":"𐖟","𐕹":"𐖠","𐕺":"𐖡","𐕼":"𐖣","𐕽":"𐖤","𐕾":"𐖥","𐕿":"𐖦","𐖀":"𐖧","𐖁":"𐖨","𐖂":"𐖩","𐖃":"𐖪","𐖄":"𐖫","𐖅":"𐖬","𐖆":"𐖭","𐖇":"𐖮","𐖈":"𐖯","𐖉":"𐖰","𐖊":"𐖱","𐖌":"𐖳","𐖍":"𐖴","𐖎":"𐖵","𐖏":"𐖶","𐖐":"𐖷","𐖑":"𐖸","𐖒":"𐖹","𐖔":"𐖻","𐖕":"𐖼","𐲀":"𐳀","𐲁":"𐳁","𐲂":"𐳂","𐲃":"𐳃","𐲄":"𐳄","𐲅":"𐳅","𐲆":"𐳆","𐲇":"𐳇","𐲈":"𐳈","𐲉":"𐳉","𐲊":"𐳊","𐲋":"𐳋","𐲌":"𐳌","𐲍":"𐳍","𐲎":"𐳎","𐲏":"𐳏","𐲐":"𐳐","𐲑":"𐳑","𐲒":"𐳒","𐲓":"𐳓","𐲔":"𐳔","𐲕":"𐳕","𐲖":"𐳖","𐲗":"𐳗","𐲘":"𐳘","𐲙":"𐳙","𐲚":"𐳚","𐲛":"𐳛","𐲜":"𐳜","𐲝":"𐳝","𐲞":"𐳞","𐲟":"𐳟","𐲠":"𐳠","𐲡":"𐳡","𐲢":"𐳢","𐲣":"𐳣","𐲤":"𐳤","𐲥":"𐳥","𐲦":"𐳦","𐲧":"𐳧","𐲨":"𐳨","𐲩":"𐳩","𐲪":"𐳪","𐲫":"𐳫","𐲬":"𐳬","𐲭":"𐳭","𐲮":"𐳮","𐲯":"𐳯","𐲰":"𐳰","𐲱":"𐳱","𐲲":"𐳲","𑢠":"𑣀","𑢡":"𑣁","𑢢":"𑣂","𑢣":"𑣃","𑢤":"𑣄","𑢥":"𑣅","𑢦":"𑣆","𑢧":"𑣇","𑢨":"𑣈","𑢩":"𑣉","𑢪":"𑣊","𑢫":"𑣋","𑢬":"𑣌","𑢭":"𑣍","𑢮":"𑣎","𑢯":"𑣏","𑢰":"𑣐","𑢱":"𑣑","𑢲":"𑣒","𑢳":"𑣓","𑢴":"𑣔","𑢵":"𑣕","𑢶":"𑣖","𑢷":"𑣗","𑢸":"𑣘","𑢹":"𑣙","𑢺":"𑣚","𑢻":"𑣛","𑢼":"𑣜","𑢽":"𑣝","𑢾":"𑣞","𑢿":"𑣟","𖹀":"𖹠","𖹁":"𖹡","𖹂":"𖹢","𖹃":"𖹣","𖹄":"𖹤","𖹅":"𖹥","𖹆":"𖹦","𖹇":"𖹧","𖹈":"𖹨","𖹉":"𖹩","𖹊":"𖹪","𖹋":"𖹫","𖹌":"𖹬","𖹍":"𖹭","𖹎":"𖹮","𖹏":"𖹯","𖹐":"𖹰","𖹑":"𖹱","𖹒":"𖹲","𖹓":"𖹳","𖹔":"𖹴","𖹕":"𖹵","𖹖":"𖹶","𖹗":"𖹷","𖹘":"𖹸","𖹙":"𖹹","𖹚":"𖹺","𖹛":"𖹻","𖹜":"𖹼","𖹝":"𖹽","𖹞":"𖹾","𖹟":"𖹿","𞤀":"𞤢","𞤁":"𞤣","𞤂":"𞤤","𞤃":"𞤥","𞤄":"𞤦","𞤅":"𞤧","𞤆":"𞤨","𞤇":"𞤩","𞤈":"𞤪","𞤉":"𞤫","𞤊":"𞤬","𞤋":"𞤭","𞤌":"𞤮","𞤍":"𞤯","𞤎":"𞤰","𞤏":"𞤱","𞤐":"𞤲","𞤑":"𞤳","𞤒":"𞤴","𞤓":"𞤵","𞤔":"𞤶","𞤕":"𞤷","𞤖":"𞤸","𞤗":"𞤹","𞤘":"𞤺","𞤙":"𞤻","𞤚":"𞤼","𞤛":"𞤽","𞤜":"𞤾","𞤝":"𞤿","𞤞":"𞥀","𞤟":"𞥁","𞤠":"𞥂","𞤡":"𞥃"}'::jsonb;
 v_normalized text := normalize(value,NFC);
 v_result text := '';
 v_character text;
begin
 for i in 1..char_length(v_normalized) loop
  v_character := substr(v_normalized,i,1);
  v_result := v_result || coalesce(v_map ->> v_character,v_character);
 end loop;
 return normalize(v_result,NFC);
end $$;

create table public.private_groups (
 id uuid primary key default gen_random_uuid(),
 title text not null default 'The Birmingham Private League',
 created_at timestamptz not null default now(),
 singleton boolean not null default true unique check(singleton)
);
insert into public.private_groups(id) values ('00000000-0000-4000-8000-000000000001');
create table public.group_members (
 group_id uuid not null references public.private_groups(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 member_slot integer not null check(member_slot between 1 and 3),
 primary key(group_id,user_id), unique(user_id), unique(group_id,member_slot)
);
create table public.tournaments (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.private_groups(id),
 title text not null check(char_length(title) between 1 and 80),
 version integer not null default 0 check(version >= 0),
 created_at timestamptz not null default now(), completed_at timestamptz,
 updated_at timestamptz not null default now(),
 last_editor uuid references auth.users(id) on delete set null,
 unique(group_id,id)
);
create unique index one_unfinished_tournament on public.tournaments(group_id) where completed_at is null;
create table public.players (
 tournament_id uuid not null references public.tournaments(id),
 slot integer not null check(slot between 1 and 3),
 name text not null check(char_length(name) between 1 and 40),
 name_key text generated always as (private.name_key(name)) stored,
 primary key(tournament_id,slot),
 constraint unique_player_names_constraint unique(tournament_id,name_key) deferrable initially immediate
);
create table public.matches (
 tournament_id uuid not null references public.tournaments(id),
 number integer not null check(number between 1 and 10), played_at timestamptz,
 primary key(tournament_id,number)
);
create table public.match_results (
 tournament_id uuid not null,
 match_number integer not null,
 player_slot integer not null,
 position integer not null check(position between 1 and 3),
 points integer generated always as (case position when 1 then 10 when 2 then 5 else 0 end) stored,
 primary key(tournament_id,match_number,player_slot),
 unique(tournament_id,match_number,position),
 foreign key(tournament_id,match_number) references public.matches(tournament_id,number),
 foreign key(tournament_id,player_slot) references public.players(tournament_id,slot)
);

alter table public.private_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.tournaments enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_results enable row level security;
create policy own_membership on public.group_members for select to authenticated using(user_id = (select auth.uid()));
create policy member_group on public.private_groups for select to authenticated using(exists(select 1 from public.group_members m where m.group_id=id));
create policy member_tournament on public.tournaments for select to authenticated using(exists(select 1 from public.group_members m where m.group_id=tournaments.group_id));
create policy member_players on public.players for select to authenticated using(exists(select 1 from public.tournaments t where t.id=tournament_id));
create policy member_matches on public.matches for select to authenticated using(exists(select 1 from public.tournaments t where t.id=tournament_id));
create policy member_results on public.match_results for select to authenticated using(exists(select 1 from public.tournaments t where t.id=tournament_id));
revoke all on public.private_groups,public.group_members,public.tournaments,public.players,public.matches,public.match_results from public,anon,authenticated;
grant select on public.private_groups,public.group_members,public.tournaments,public.players,public.matches,public.match_results to authenticated;

-- Internal routines cannot be called through the exposed public API.
-- Match JavaScript String.trim, including Unicode whitespace at the edges.
create function private.trim_text(value text) returns text language sql immutable set search_path='' as $$
 select btrim(value, E' \t\n\r\f' || chr(11) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279))
$$;
create function private.checked_names(p_names text[]) returns text[] language plpgsql immutable set search_path='' as $$
declare v_names text[];
begin
 if p_names is null or array_ndims(p_names) <> 1 or cardinality(p_names) <> 3 then raise exception 'VALIDATION'; end if;
 select array_agg(private.trim_text(n) order by ord) into v_names from unnest(p_names) with ordinality as x(n,ord);
 if exists(select 1 from unnest(v_names) n where n is null or char_length(n) not between 1 and 40)
 or (select count(distinct private.name_key(n)) from unnest(v_names) n) <> 3 then raise exception 'VALIDATION'; end if;
 return v_names;
end $$;
create function private.member_group() returns uuid language plpgsql stable security definer set search_path='' as $$
declare v_group uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select group_id into v_group from public.group_members where user_id=auth.uid();
 if v_group is null then raise exception 'FORBIDDEN'; end if;
 return v_group;
end $$;
revoke all on all functions in schema private from public,anon,authenticated;

create function public.create_tournament(p_title text,p_names text[]) returns uuid language plpgsql security definer set search_path='' as $$
declare v_group uuid; v_id uuid; v_names text[]; v_title text;
begin
 v_group:=private.member_group();
 perform 1 from public.private_groups where id=v_group for update;
 v_names:=private.checked_names(p_names); v_title:=private.trim_text(p_title);
 if v_title is null or char_length(v_title) not between 1 and 80 then raise exception 'VALIDATION'; end if;
 if exists(select 1 from public.tournaments where group_id=v_group and completed_at is null) then raise exception 'ACTIVE_TOURNAMENT_EXISTS'; end if;
 insert into public.tournaments(group_id,title,last_editor) values(v_group,v_title,auth.uid()) returning id into v_id;
 insert into public.players select v_id,ord::integer,n from unnest(v_names) with ordinality x(n,ord);
 insert into public.matches(tournament_id,number) select v_id,generate_series(1,10);
 return v_id;
end $$;
create function public.save_match_result(p_tournament_id uuid,p_match_number integer,p_placements integer[],p_expected_version integer) returns void language plpgsql security definer set search_path='' as $$
declare v_group uuid; v_t public.tournaments%rowtype; v_count integer; v_played timestamptz;
begin
 v_group:=private.member_group();
 perform 1 from public.private_groups where id=v_group for update;
 select * into v_t from public.tournaments where id=p_tournament_id and group_id=v_group for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p_expected_version is null or p_expected_version<>v_t.version then raise exception 'VERSION_CONFLICT'; end if;
 if p_match_number is null or p_match_number not between 1 and 10 or p_placements is null
 or array_ndims(p_placements)<>1 or cardinality(p_placements)<>3
 or (select count(distinct x) from unnest(p_placements) x where x between 1 and 3)<>3 then raise exception 'VALIDATION'; end if;
 select played_at into v_played from public.matches where tournament_id=p_tournament_id and number=p_match_number;
 select count(*) into v_count from public.matches where tournament_id=p_tournament_id and played_at is not null;
 if v_played is null and p_match_number<>v_count+1 then raise exception 'VALIDATION'; end if;
 delete from public.match_results where tournament_id=p_tournament_id and match_number=p_match_number;
 insert into public.match_results(tournament_id,match_number,player_slot,position) select p_tournament_id,p_match_number,x,ord::integer from unnest(p_placements) with ordinality as a(x,ord);
 update public.matches set played_at=coalesce(played_at,now()) where tournament_id=p_tournament_id and number=p_match_number;
 update public.tournaments set version=version+1,updated_at=now(),last_editor=auth.uid(),completed_at=case when v_count + case when v_played is null then 1 else 0 end =10 then coalesce(completed_at,now()) else completed_at end where id=p_tournament_id;
end $$;
create function public.rename_players(p_tournament_id uuid,p_names text[],p_expected_version integer) returns void language plpgsql security definer set search_path='' as $$
declare v_group uuid; v_t public.tournaments%rowtype; v_names text[];
begin
 v_group:=private.member_group();
 perform 1 from public.private_groups where id=v_group for update;
 select * into v_t from public.tournaments where id=p_tournament_id and group_id=v_group for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if p_expected_version is null or p_expected_version<>v_t.version then raise exception 'VERSION_CONFLICT'; end if;
 v_names:=private.checked_names(p_names);
 -- One statement and a deferred uniqueness check allow swapping names.
 set constraints public.unique_player_names_constraint deferred;
 update public.players p set name=x.n from unnest(v_names) with ordinality x(n,ord) where p.tournament_id=p_tournament_id and p.slot=x.ord;
 set constraints public.unique_player_names_constraint immediate;
 update public.tournaments set version=version+1,updated_at=now(),last_editor=auth.uid() where id=p_tournament_id;
end $$;

create function public.read_tournament(p_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_result jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.group_members where user_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
 select jsonb_build_object('id',t.id,'groupId',t.group_id,'title',t.title,'version',t.version,'createdAt',t.created_at,'completedAt',t.completed_at,
 'players',(select jsonb_agg(jsonb_build_object('slot',p.slot,'name',p.name) order by p.slot) from public.players p where p.tournament_id=t.id),
 'matches',(select jsonb_agg(jsonb_build_object('number',m.number,'playedAt',m.played_at,'placements',(select jsonb_agg(r.player_slot order by r.position) from public.match_results r where r.tournament_id=t.id and r.match_number=m.number)) order by m.number) from public.matches m where m.tournament_id=t.id))
 into v_result from public.tournaments t where t.id=p_id;
 if v_result is null then raise exception 'NOT_FOUND'; end if;
 return v_result;
end $$;
create function public.list_tournaments(p_cursor uuid default null,p_limit integer default 10) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_created timestamptz; v_ids uuid[]; v_items jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.group_members where user_id=auth.uid()) then raise exception 'FORBIDDEN'; end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'VALIDATION'; end if;
 if p_cursor is not null then
 select created_at into v_created from public.tournaments where id=p_cursor;
 if not found then raise exception 'NOT_FOUND'; end if;
 end if;
 select array_agg(id order by created_at desc,id desc) into v_ids from (select id,created_at from public.tournaments where p_cursor is null or (created_at,id)<(v_created,p_cursor) order by created_at desc,id desc limit p_limit+1) q;
 select coalesce(jsonb_agg(public.read_tournament(id) order by ord),'[]'::jsonb) into v_items from unnest(v_ids) with ordinality x(id,ord) where ord<=p_limit;
 return jsonb_build_object('items',v_items,'nextCursor',case when cardinality(v_ids)>p_limit then v_ids[p_limit] else null end);
end $$;
revoke all on function public.create_tournament(text,text[]),public.save_match_result(uuid,integer,integer[],integer),public.rename_players(uuid,text[],integer),public.read_tournament(uuid),public.list_tournaments(uuid,integer) from public,anon;
grant execute on function public.create_tournament(text,text[]),public.save_match_result(uuid,integer,integer[],integer),public.rename_players(uuid,text[],integer),public.read_tournament(uuid),public.list_tournaments(uuid,integer) to authenticated;
-- Publish only the invalidation table, without exposing child data.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.tournaments;
 end if;
end $$;
