# 该文件用于 数字-英文 字符转换，也就是A1Z26加密解密

def num_char_convert(num_list):

    # 将str类型的数字转化为int类型
    num_list = [int(i) for i in num_list]

    # 判断数字是否在1到26之间
    for num in num_list:
        if num < 1 or num > 26:
            raise ValueError("Number must be between 1 and 26")
        
    # 将数字转化为英文字符
    char_list = [chr(i + 96) for i in num_list]
    # 将字符连接为字符串
    result = "".join(char_list)
    
    return result

def char_num_convert(char_list):

    # 判断字符是否在a到z之间
    for char in char_list:
        if char < "a" or char > "z":
            raise ValueError("Character must be between a and z")
    
    # 将字符转化为数字
    num_list = [ord(i) - 96 for i in char_list]
    # 将数字连接为字符串
    result = "/".join([str(i) for i in num_list])
    
    return result

def convert_tool():
    # 获取需要转化的类型
    ori = input("\n # 请输入需要转化的数字或字符串，以斜杠 / 分割")

    ori_list = ori.split("/")
    
    if ori_list[0].isdigit():
        return num_char_convert(ori_list)
    else:
        ori_list = [i.lower() for i in ori_list]
        return char_num_convert(ori_list)

if __name__ == "__main__":
    print(convert_tool())
