# 该文件用于将数字转化为英文字符

def num_char_convert():

    # 获取需要转化的数字，以斜杠/分割
    num = input("# 获取需要转化的数字，以斜杠 / 分割")

    # 得到数字的list
    num_list = num.split("/")

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

if __name__ == "__main__":
    print(num_char_convert())
