# 解谜小工具

这是一组用来**辅助解谜**的小工具，能够节省在一些繁琐工作上所花费的时间。

## 工具介绍

**[cipher_to_plain](https://github.com/scamand/puzzletool/blob/main/cipher_to_plain.py)** : 当密文已经被解出，可以使用这个文件，输入密文和得到的**密文-明文对照表**，得到明文的信息。得到的明文全文小写。

**[num_char_convert](https://github.com/scamand/puzzletool/blob/main/num_char_convert.py)** : 可以输入数字串或者字母串，得到对应的另一种串，请保证输入的数字范围在 1-26 之间，或者输入的字母在 a-z 之间。

**[e2ejoin](https://github.com/scamand/puzzletool/blob/main/e2ejoin.py)** : 可以输入数字串或者字母串，得到将他们首尾相同的元素放在一起再类似于作交集后的字符串。目前是使用的穷举法，所以请不要一次输入太多元素，否则运行时间和内存占用会超乎你的想象。(你可以自行计算一下排列组合提前预估可能需要运行的时间。)


