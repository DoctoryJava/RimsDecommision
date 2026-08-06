package com.rims.decommission.common;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResult<T> {
    private long total;
    private List<T> list;
    private int pageNum;
    private int pageSize;

    public static <T> PageResult<T> of(long total, List<T> list, int pageNum, int pageSize) {
        return new PageResult<>(total, list, pageNum, pageSize);
    }
}
