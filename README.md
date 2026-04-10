# Puzzle苦力小工具

这是一组用来**辅助解谜**的小工具，能够节省在一些繁琐工作上所花费的时间。

## 在线访问

网站已部署至 GitHub Pages，可直接访问：
**https://[用户名].github.io/puzzletool/**

## 工具箱概览

### 📝 文字工具

- 移位
- 一对一密码表
- 固定密码

### 🖼️ 图像工具

- 裁切
- 拼图

### ✏️ 纸笔工具

- 自创纸笔

---

## Python 工具（本地运行）

以下工具为 Python 脚本，需要在本地环境运行。

### 1. cipher_to_plain.py — 密文转明文

根据已知的**密文-明文对照表**，将密文转换为明文。

**使用方法：**
```python
from cipher_to_plain import cipher_to_plain

cipher_text = "密文内容"
cipher_dict = "ABCDEF"      # 密文字符集
plain_dict = "IHQCSX"       # 对应的明文字符集

result = cipher_to_plain(cipher_text, cipher_dict, plain_dict)
print(result)  # 输出小写明文
```

**运行脚本：** 直接运行会使用内置示例进行转换。

---

### 2. num_char_convert.py — A1Z26 加解密

在数字（1-26）和字母（a-z）之间互相转换，即 A=1, B=2 ... Z=26 的标准编码。

**使用方法：**
```python
from num_char_convert import num_char_convert, char_num_convert

# 数字转字母
num_list = ["8", "5", "12", "25"]
result = num_char_convert(num_list)  # "hello"

# 字母转数字
char_list = ["h", "e", "l", "l", "o"]
result = char_num_convert(char_list)  # "8/5/12/12/15"
```

**运行脚本：** 直接运行会交互式询问输入，自动识别类型。

---

### 3. e2ejoin.py — 首尾拼接

将多个字符串按首尾相同的方式拼接起来。例如 `1912` 和 `1256` 以 2 位重叠拼接为 `191256`。

**功能特点：**
- 输入用 `/` 分割的字符串列表
- 指定相邻字符串的重叠位数
- 可选**衔尾蛇模式**：要求最终结果首尾也相同（Ouroboros）
- 可选保留未能拼接的部分

**使用方法：**
```python
from e2ejoin import list_out_combinations, sew_up_nums

numbers = "1912/1256/89/907"
spb = 2  # 重叠位数

# 获取所有可能的拼接方式
valid_combonations = list_out_combinations(numbers, spb, ouroboros=False)

# 拼接结果
sew_up_list = [sew_up_nums(combes, spb) for combes in valid_combonations]
```

**运行脚本：** 直接运行会交互式询问输入。

**注意：** 由于使用穷举法，元素数量过多时运行时间和内存消耗会急剧增长，请提前预估可能的排列数量。

---

### 4. test.py — 条件搜索工具

根据特定条件（如数字之和）在所有排列结果中筛选满足条件的序列。用于探索数据中的规律。

---

## 文件结构

```
puzzletool/
├── index.html              # 网页工具箱首页（GitHub Pages 入口）
├── styles.css              # 页面样式表
├── cipher_to_plain.py      # 密文转明文
├── num_char_convert.py     # A1Z26 加解密
├── e2ejoin.py              # 首尾拼接
├── test.py                 # 条件搜索测试
└── README.md
```
