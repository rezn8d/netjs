var _ = require('lodash');

exports.plugin = function($N) {
    return {
        name: 'Schema.org',
        description: 'Useful schemas',
        options: {},
        version: '1.0',
        author: 'http://schema.org',
        start: function() {
            var propPrefix = 's_'; //for schema.org

            var schemaorg = require('./schema.org.json');
            var types = schemaorg.types;
            var properties = schemaorg.properties;

            function mapURI(u) {
                if (u === 'Person')
                    return 'Human';
                if (u === 'Physical')
                    return 'MedicalPhysical';
                return u;
            }
            function mapTagName(u, n) {
                if (u === 'Person')
                    return 'Human';
                if (u === 'Physical')
                    return 'Medical Physical (Checkup)';
                return n;
            }
            function mapPropertyName(u) {
                if (u === 's_email')
                    return 'email';
                return u;
            }
            

            var excludeProperties = ['description', 'image', 'name', 'url', 'about', 'sameAs', 'additionalType', 'alternateName'];
            var excludeTypes = ['Class', 'Property'];
            var rootTypes = ['Action'];

            //http://schema.org/docs/full.html
            $N.addAll(_.map(properties, function(prop) {
                function propType(ranges) {
                    if (ranges.indexOf('URL')!=-1) {
                        return 'url';
                    }
                    else if (ranges.indexOf('Text')!=-1) {
                        return 'text';
                    }
                    else if (ranges.indexOf('Number')!=-1) {
                        return 'real';
                    }
                    else if (ranges.indexOf('Boolean')!=-1) {
                        return 'boolean';
                    }
                    else if (ranges.indexOf('Date')!=-1) {
                        return 'timerange';
                    }
                    else if (ranges.indexOf('DateTime')!=-1) {
                        return 'timepoint';
                    }
                    else if (ranges.indexOf('Time')!=-1) {
                        return 'timerange';
                    }
                    else if (ranges.indexOf('Float')!=-1) {
                        return 'real';
                    }
                    else if (ranges.indexOf('Integer')!=-1) {
                        return 'integer';
                    }
                    else {
                        return 'object'; //ranges;
                    }
                }

                var pt = propType(prop.ranges);
                var p = {
                    id: mapPropertyName(propPrefix + prop.id),
                    name: prop.label,
                    description: prop.comment,
                    extend: pt
                };
                if (p.description.length === 0)
                    delete p.description;
                if (pt === 'object') {
                    p.tag = _.map(prop.ranges, function(r) {
                        return mapURI(r);
                    });
                }

                return p;
            }));

            $N.addAll(_.map(types, function(type) {
                if (_.contains(excludeTypes, type.id))
                    return;
                var t = {
                    id: mapURI(type.id),
                    name: mapTagName(type.id, type.label),
                    description: type.comment,
                    value: _.map(_.difference(type.properties, excludeProperties), function(p) {
                        return mapPropertyName(propPrefix + p);
                    }),
                    extend: type.supertypes
                };
                if (t.description.length == 0)
                    delete t.description;
                if (t.id !== type.id)
                    t.sid = type.id; //the original schema.org URI

                if (_.contains(rootTypes, type.id)) {
                    t.extend = null;
                }
                return t;
            }));

        },
        stop: function() {
            //TODO remove any schema.org tags that may have been created
        }
    };
};

/*var schema, code;
 var types = {};
 
 function getSchemaRoots() {
 var roots = { };
 $.each(schema.types, function(k, v) {
 if (v.ancestors.length == 1) {
 if (v.ancestors[0] == 'Thing')
 roots[k] = v;
 }
 });
 return roots;            
 }
 function getSchemaChildren(parent) {
 var roots = { };
 var count = 0;
 var maxItems = 500;
 $.each(schema.types, function(k, v) {
 for (var i = 0; i < v.ancestors.length; i++) {
 if (v.ancestors[i] == parent) {                        
 roots[k] = v;
 count++;
 }
 if (count > maxItems)
 return roots;
 }
 });
 return roots;                        
 }
 
 function loadTypeMenu(parent, children) {
 if (parent!=null)
 if (children.length == 0)
 if (schema.types[parent].properties.length < 1)
 return '';
 
 var s = '';
 $.each(children, function(k, v) {
 var sc = getSchemaChildren(k);
 var scLen = Object.keys(sc).length;
 //s+= '<li><a href="#">' + k + ' ' + scLen + '</a></li>';
 
 var tt = '';
 if (scLen > 0) {               
 tt = loadTypeMenu(k, sc);
 }
 s+= '<li><a href="javascript:addInterest(\'' + k + '\', null, null)">' + v.label + '</a>' + tt + '</li>';
 });
 
 return '<ul>' + s + '</ul>';
 
 }
 
 function getProperties(type) {
 var t = schema.types[type];
 if (t!=undefined)
 return schema.types[type].properties;
 else
 return [];
 }
 
 function isCommonProperty(v) {
 return (v == 'url') || (v == 'description') || (v == 'name') || (v == 'image');
 }
 function isDataPropertyType(v) {
 return (v == 'Integer') || (v == 'URL') || (v=='Text') || (v=='Boolean') || (v=='Geo') || (v=='Float') || (v=='Date') || (v=='DataType') || (v=='Number') || (v=='Thing');
 }
 function isSupertype(parent, child) {
 if (isDataPropertyType(child)) {
 return false;
 }
 var parents = schema.types[child];
 if (parents==undefined)
 return false;
 
 parents = parents.supertypes;
 $.each(parents, function(t) {
 if (t == parent)
 return true;
 if (isSupertype(parent, t))
 return true;               
 });
 return false;
 }
 
 function loadPropertiesMenu(type, history) {
 var MAXDEPTH = 3;
 
 if (history == undefined) history = [ type ];
 var level = history.length - 1;
 if (level >= MAXDEPTH) return '';
 
 var t = '';
 var props = getProperties(type);
 
 $.each(props, function(k, v) {
 if (isCommonProperty(v)) {
 //do not add
 }
 else if (schema.properties[v].comment.indexOf('legacy spelling')!=-1) {
 
 }
 else {
 var label = schema.properties[v].label;
 var range = schema.properties[v].ranges[0];
 
 if (isDataPropertyType(range))  {
 t += '<li><a href="javascript:addProperty(\'' + v + '\', \'' + history + '\')">' + label + '</a></li>';                        
 }
 else if (level < MAXDEPTH-1) {
 if (!isSupertype(type, range)) {
 if (schema.types[range].properties.length > 0) {
 history.push(v);
 t += '<li><a href="#">' + label + '</a>' + loadPropertiesMenu(range, history) + "</li>";
 history.pop();
 }
 }
 }
 }
 });
 if (level == 0)
 t += '<li><a href="javascript:removeInterest(\'' + type + '\')"><i>Remove</i></a></li>';
 return '<ul> ' + t + '</ul>';
 }
 
 function isDataType(t) {
 return (t == 'Text') || (t == 'Boolean') || (t == 'URL') || (t == 'Integer') || (t == 'Float') || (t == 'Number') || (t == 'Date') || (t=='Thing');
 }
 
 
 function loadSchema(path, whenSchemaLoaded) {
 $.getJSON(path, function(data) {
 schema = data; 
 
 if (whenSchemaLoaded!=undefined)
 whenSchemaLoaded();
 });            
 }
 */
