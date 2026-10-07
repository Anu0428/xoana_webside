package com.xoana.dto;

/** Server-verified account information; never includes credentials or tokens. */
public record AdminSessionResponse(Long id, String username, String nickname, String email, String role) {
}
