# 组件库使用规范

## Ant Design 图标使用指南

### 1. 图标导入规范

#### ✅ 正确的导入方式
```typescript
// 从 @ant-design/icons 导入具体图标
import { UserOutlined, SettingOutlined, HomeOutlined } from '@ant-design/icons';

// 使用时直接引用
<UserOutlined />
```

#### ❌ 错误的导入方式
```typescript
// 不要导入不存在的图标
import { TrendingUpOutlined, TrendingDownOutlined } from '@ant-design/icons'; // 这些图标不存在

// 不要使用动态导入未验证的图标
const IconComponent = Icons[iconName]; // 可能导致运行时错误
```

### 2. 常用图标映射表

| 功能描述 | 推荐图标 | 备选图标 |
|---------|---------|----------|
| 上升趋势 | `RiseOutlined` | `ArrowUpOutlined`, `TrendingUpOutlined`* |
| 下降趋势 | `FallOutlined` | `ArrowDownOutlined`, `TrendingDownOutlined`* |
| 用户 | `UserOutlined` | `TeamOutlined` |
| 设置 | `SettingOutlined` | `ToolOutlined` |
| 首页 | `HomeOutlined` | `DashboardOutlined` |
| 搜索 | `SearchOutlined` | `FinderOutlined` |
| 编辑 | `EditOutlined` | `FormOutlined` |
| 删除 | `DeleteOutlined` | `CloseOutlined` |
| 添加 | `PlusOutlined` | `PlusCircleOutlined` |
| 保存 | `SaveOutlined` | `CheckOutlined` |

*注：标记的图标在某些版本中可能不存在，请使用推荐图标。

### 3. 图标验证流程

#### 开发前验证
1. 查看 [Ant Design 官方图标库](https://ant.design/components/icon-cn)
2. 在项目中测试导入：
   ```typescript
   // 测试导入
   import { YourIconName } from '@ant-design/icons';
   ```
3. 确认图标在当前版本中存在

#### 替换不存在图标的步骤
1. 识别错误：查看控制台错误信息
2. 查找替代：在官方文档中寻找相似功能图标
3. 批量替换：使用 IDE 的查找替换功能
4. 测试验证：确保替换后功能正常

### 4. 自定义图标规范

#### SVG 图标组件
```typescript
// components/icons/CustomIcon.tsx
import React from 'react';
import Icon from '@ant-design/icons';
import type { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';

const CustomSvg = () => (
  <svg width="1em" height="1em" fill="currentColor" viewBox="0 0 1024 1024">
    {/* SVG 路径 */}
  </svg>
);

const CustomIcon = (props: Partial<CustomIconComponentProps>) => (
  <Icon component={CustomSvg} {...props} />
);

export default CustomIcon;
```

#### 图标命名规范
- 使用 PascalCase
- 以功能描述命名，如 `DataTrendIcon`
- 添加 `Icon` 后缀以区分普通组件

### 5. 性能优化建议

#### 按需导入
```typescript
// ✅ 推荐：按需导入
import { UserOutlined } from '@ant-design/icons';

// ❌ 避免：全量导入
import * as Icons from '@ant-design/icons';
```

#### 图标缓存
```typescript
// 对于动态图标，使用 Map 缓存
const iconCache = new Map();

const getIcon = (iconName: string) => {
  if (!iconCache.has(iconName)) {
    // 动态导入并缓存
    iconCache.set(iconName, require(`@ant-design/icons/${iconName}`).default);
  }
  return iconCache.get(iconName);
};
```

### 6. 错误处理

#### 图标加载失败处理
```typescript
import React from 'react';
import { QuestionCircleOutlined } from '@ant-design/icons';

interface SafeIconProps {
  iconName: string;
  fallback?: React.ReactNode;
}

const SafeIcon: React.FC<SafeIconProps> = ({ 
  iconName, 
  fallback = <QuestionCircleOutlined /> 
}) => {
  try {
    const IconComponent = require(`@ant-design/icons/${iconName}`).default;
    return <IconComponent />;
  } catch (error) {
    console.warn(`Icon ${iconName} not found, using fallback`);
    return fallback;
  }
};
```

### 7. 版本兼容性

#### 检查图标兼容性
```bash
# 检查当前 Ant Design 版本
npm list antd @ant-design/icons

# 升级到最新版本
npm update antd @ant-design/icons
```

#### 版本迁移指南
- v4.x → v5.x：部分图标名称变更
- 查看 [迁移文档](https://ant.design/docs/react/migration-v5-cn)
- 使用 codemod 工具自动迁移

### 8. 开发工具配置

#### VSCode 插件推荐
- Ant Design Vue helper
- Auto Import - ES6, TS, JSX, TSX
- TypeScript Importer

#### 代码片段
```json
// .vscode/snippets.json
{
  "Ant Design Icon Import": {
    "prefix": "adi",
    "body": [
      "import { ${1:IconName} } from '@ant-design/icons';"
    ],
    "description": "Import Ant Design Icon"
  }
}
```

## 总结

遵循这些规范可以：
- 避免导入不存在的图标
- 提高代码可维护性
- 减少运行时错误
- 提升开发效率

定期检查和更新图标使用，确保与最新版本兼容。