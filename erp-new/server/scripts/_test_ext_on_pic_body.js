const { saveArchiveExtFields } = require('../billExtFieldHook');
const fs = require('fs');
const path = require('path');

(async () => {
  const files = fs.readdirSync(path.join(__dirname, '../uploads')).filter((f) => f.endsWith('.png'));
  const body = {
    idx1: '01',
    name: 'test',
    pic: '/uploads/' + files[0],
    cadimg: '',
    ext_fields: {},
  };
  try {
    await saveArchiveExtFields('FasECA', { prd_no: '__EXT_TEST__' }, body);
    console.log('saveArchiveExtFields OK');
  } catch (e) {
    console.log('saveArchiveExtFields FAIL:', e.message);
  }
})();
