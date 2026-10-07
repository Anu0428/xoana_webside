package com.xoana.controller;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

final class Pagination {
    private Pagination() {
    }

    static PageRequest of(int page, int size, Sort sort) {
        if (page < 0 || size < 1 || size > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page 必须大于等于 0，size 必须在 1 到 1000 之间");
        }
        return PageRequest.of(page, size, sort);
    }

    static PageRequest of(int page, int size) {
        return of(page, size, Sort.unsorted());
    }
}
