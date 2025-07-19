// 简单的 simenticallyEqual 函数实现（用于测试）
function normalizeString(str) {
  // 移除 @ 符号、空格、点号等特殊字符，并转换为小写
  return str
    .toLowerCase()
    .replace(/[@\s\\.]/g, '') // 移除 @、空格、点号
    .replace(/[^\w]/g, ''); // 只保留字母和数字
}

function simenticallyEqual(a, b) {
  const normalizedA = normalizeString(a);
  const normalizedB = normalizeString(b);
  return normalizedA === normalizedB;
}

// 简单的测试运行器
function runTest(testName, testFn) {
  try {
    const result = testFn();
    if (result) {
      globalThis.console.log(`✅ ${testName} - PASSED`);
    } else {
      globalThis.console.log(`❌ ${testName} - FAILED`);
    }
    return result;
  } catch (error) {
    globalThis.console.log(`❌ ${testName} - ERROR: ${error}`);
    return false;
  }
}

// 测试用例
const tests = [
  {
    name: 'ChatGPT 2.1 和 @chatgpt21 应该相等',
    test: () => simenticallyEqual('ChatGPT 2.1', '@chatgpt21'),
  },
  {
    name: 'OpenAI 和 @openai 应该相等',
    test: () => simenticallyEqual('OpenAI', '@openai'),
  },
  {
    name: '#chatgpt 和 @chatgpt 应该相等',
    test: () => simenticallyEqual('#chatgpt', '@chatgpt'),
  },
  {
    name: 'Microsoft 和 @microsoft 应该相等',
    test: () => simenticallyEqual('Microsoft', '@microsoft'),
  },
  {
    name: 'Google AI 和 @googleai 应该相等',
    test: () => simenticallyEqual('Google AI', '@googleai'),
  },
  {
    name: 'Anthropic 和 @anthropic 应该相等',
    test: () => simenticallyEqual('Anthropic', '@anthropic'),
  },
  {
    name: '相同的字符串应该相等',
    test: () => simenticallyEqual('test', 'test'),
  },
  {
    name: '不同的大小写应该相等',
    test: () => simenticallyEqual('Test', 'test'),
  },
  {
    name: '包含空格和特殊字符的应该相等',
    test: () => simenticallyEqual('Test User', '@testuser'),
  },
  {
    name: '不同的字符串不应该相等',
    test: () => !simenticallyEqual('test', 'different'),
  },
  {
    name: '空字符串应该相等',
    test: () => simenticallyEqual('', ''),
  },
];

// 运行所有测试
function runAllTests() {
  globalThis.console.log('🧪 开始运行 simenticallyEqual 测试...\n');

  let passed = 0;
  let total = tests.length;

  for (const test of tests) {
    if (runTest(test.name, test.test)) {
      passed++;
    }
  }

  globalThis.console.log(`\n📊 测试结果: ${passed}/${total} 通过`);

  if (passed === total) {
    globalThis.console.log('🎉 所有测试都通过了！');
  } else {
    globalThis.console.log('⚠️  有测试失败了，请检查代码。');
  }
}

// 运行测试
runAllTests();
