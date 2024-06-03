# 这里是根据对照表，输入密文，输出明文的代码

def cipher_to_plain(cipher_text, cipher_dict, plain_dict):
    # 首先将cipher_dict转化为list
    cipher_list = list(cipher_dict)
    # 然后将plain_dict转化为list
    plain_list = list(plain_dict)
    # 将cipher_list和plain_list合并为一个dict
    cipher_plain_dict = dict(zip(cipher_list, plain_list))

    # 将密文转化为list
    cipher_text_list = list(cipher_text)
    # 用于存放明文的list
    plain_text_list = []
    # 遍历密文
    for cipher in cipher_text_list:
        # 如果密文在对照表中
        if cipher in cipher_plain_dict:
            # 将对应的明文添加到plain_text_list
            plain_text_list.append(cipher_plain_dict[cipher])
        # 如果密文不在对照表中
        else:
            # 将密文添加到plain_text_list
            plain_text_list.append(cipher)
    
    # 将plain_text_list连接为字符串
    plain_text = "".join(plain_text_list)

    # 将plain_text变为小写
    plain_text = plain_text.lower()

    return plain_text

if __name__ == "__main__":
    cipher_text = """   DAPNVOVXXM, SAEKOVMKVN WU BVO
                        EKVYJMSAXU, MKKVPNE M ORUMX WMXX
                        TAKB BVO JMAOU QRNSRKBVO'E
                        BVXY. EBV VPDBMPKE KBV YOAPDV,
                        WIK NAEMYYVMOE MK SANPAQBK,
                        XVMZAPQ WVBAPN BVO QXMEE EXAYYVO.
                        KBV YOAPDV EVMODBVE JRO BVO, MPN
                        TBVP KBV EXAYYVO JAKE
                        DAP NVOVXXM'E JRRK, KBVU JAPN
                        VPNIOAPQ XRZV MPN BMYYAPVEE. KBV
                        MPETVO AE KOMPEYROKE. KRQVKBVO,
                        KBVU RZVODRSV RWEKMDXVE MPN XAZV
                        BMYYAXU VZVO MJKVO."""
    
    cipher_dict = "ABCDEF--IJK-MNOPQRSTUVWXYZ"   # ABCDEF--IJK-MNOPQRSTUVWXYZ
    plain_dict = "IHQCSX--UFT-ADRNGOMWYEBLPV"    # IHQCSX--UFT-ADRNGOMWYEBLPV
    print(str(cipher_to_plain(cipher_text, cipher_dict, plain_dict)))
