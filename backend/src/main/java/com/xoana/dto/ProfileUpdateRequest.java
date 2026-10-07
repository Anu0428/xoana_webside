package com.xoana.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfileUpdateRequest {
    @Size(max = 50)
    private String nickname;
    @Size(max = 20)
    private String phone;
    @Size(max = 500)
    private String address;
    @Size(max = 200)
    private String avatar;
}
