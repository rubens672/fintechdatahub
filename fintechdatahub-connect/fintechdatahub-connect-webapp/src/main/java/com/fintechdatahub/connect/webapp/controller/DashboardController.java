package com.fintechdatahub.connect.webapp.controller;

import com.fintechdatahub.connect.webapp.dto.NewsItemDto;
import com.fintechdatahub.connect.webapp.service.NewsRestConsumerService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Controller
public class DashboardController {

    private final NewsRestConsumerService newsRestConsumerService;

    public DashboardController(NewsRestConsumerService newsRestConsumerService) {
        this.newsRestConsumerService = newsRestConsumerService;
    }

    @GetMapping({"/", "/dashboard"})
    public String showDashboard(Model model) {
        List<NewsItemDto> newsList = newsRestConsumerService.fetchNewsFromRestService();
        model.addAttribute("newsList", newsList);
        return "dashboard";
    }
}
