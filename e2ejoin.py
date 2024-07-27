from itertools import permutations

""" 
该文件用于将数字分开并首尾相连
比如对于 1912 和 1256, 我们将其拼接为 191256

目前实现：
1. 接收一次输入，输入的数字使用 / 进行分割，得到一个列表
2. 找出所有首尾相连的可能性，需要用上所有的数字
3. 可以设置是否寻找 ”衔尾蛇“ ，Ouroboros=True 时，将寻找能让结尾与开头相同的那个序列
4. 可以设置是否保留未拼接的数字，keep_unsew=True 时，将返回未拼接的数字列表


"""


def split_numbers(number, spb):
    """将列表中的数字按照输入的参数分割"""
    split_list = [number[0:spb], number[spb:]]
    return split_list

def list_out_all_combinations(numbers):
    """找出所有首尾相连的可能性"""
    numbers = numbers.split('/')

    all_combinations = [list(combe) for combe in permutations(numbers)]

    # for combination in all_combinations:
    #     joined = ''.join(combination)
    #     if ouroboros:
    #         if joined[0] == joined[-1]:
    #             valid_combinations.append(joined)
    #     else:
    #         valid_combinations.append(joined)
    return all_combinations

def if_fitting_combinations(combe, spb, ouroboros):
    """
    对相邻数字进行查询，
    发现前一个数字的后 spb 位数 和 后一个数字的前 spb 位数有不都相同的combe，就返回false，然后在 all_combinations 中删除这个combe
    """
    for i in range(len(combe) - 1):
        if combe[i][-spb:] != combe[i+1][:spb]:
            return False
        

    if ouroboros:
        if combe[0][-spb:] != combe[-1][:spb]:
            return False
    return True

def list_out_combinations(numbers, spb, ouroboros):
    """找出所有首尾相连的可能性"""
    all_combinations = list_out_all_combinations(numbers)

    valid_combinations = []
    for combination in all_combinations:
        if if_fitting_combinations(combination, spb, ouroboros):
            valid_combinations.append(combination)
    return valid_combinations

def sew_up_nums(combe_list, spb, keep_unsew=False):
    """将数字拼接起来"""
    sew_up_list = []
    nums_list = []
    for num in combe_list:
        num_list = split_numbers(num, spb)
        nums_list.append(num_list)

    str = nums_list[0][0]
    sew_up_list.append(nums_list[0][0])
    for i in range(len(combe_list)):
        str += nums_list[i][1]
    
    sew_up_list = [str[i:i+spb] for i in range(0, len(str), spb)]

    if keep_unsew:
        return sew_up_list
    else:
        return str


def main():
    numbers = input("请输入需要拼接的数字，以斜杠 / 分割")
    spb = int(input("请输入相邻数字的重叠位数"))
    ouroboros = input("是否寻找衔尾蛇？(Y/N)").lower() == 'y'
    keep_unsew = input("是否保留未拼接的数字？(Y/N)").lower() == 'y'

    valid_combonations = list_out_combinations(numbers, spb, ouroboros)
    sew_up_list = [sew_up_nums(combes, spb, keep_unsew) for combes in valid_combonations]

    return valid_combonations, sew_up_list

if __name__ == "__main__":

    valid_combonations, sew_up_list = main()
    print("\n\n\n所有可能的拼接方式为：\n", valid_combonations, "\n\n\n", "共有", len(valid_combonations), "种可能\n\n\n")
    print("\n\n\n拼接后的结果为：\n", sew_up_list, "\n\n\n", "共有", len(sew_up_list), "种可能\n\n\n")
    

